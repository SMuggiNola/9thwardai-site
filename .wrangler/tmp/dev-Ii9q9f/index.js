var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-qsFB5m/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.js
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/questions" && request.method === "POST") {
      return await getQuestions(request, env);
    }
    if (url.pathname === "/submit" && request.method === "POST") {
      return await submitAnswers(request, env);
    }
    if (url.pathname === "/debug/submissions" && request.method === "GET") {
      if (!checkAdminKey(request, env)) {
        return unauthorizedResponse();
      }
      return await listSubmissions(url, env);
    }
    if (url.pathname === "/debug/questions" && request.method === "GET") {
      if (!checkAdminKey(request, env)) {
        return unauthorizedResponse();
      }
      return await listQuestions(url, env);
    }
    return new Response("Not Found", { status: 404 });
  }
};
function checkAdminKey(request, env) {
  const keyFromHeader = request.headers.get("x-admin-key");
  return keyFromHeader && keyFromHeader === env.ADMIN_KEY;
}
__name(checkAdminKey, "checkAdminKey");
function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
}
__name(unauthorizedResponse, "unauthorizedResponse");
async function getQuestions(request, env) {
  const { student_id } = await request.json();
  if (!student_id) {
    return new Response(JSON.stringify({
      error: "Missing student_id",
      message: "Please enter your email before starting."
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const latest = await env.DB.prepare(
    `SELECT batch_id, score FROM submissions
     WHERE student_id = ?1
     ORDER BY created_at DESC LIMIT 1`
  ).bind(student_id).first();
  if (latest) {
    const { results: tries } = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM submissions
       WHERE student_id = ?1 AND batch_id = ?2 AND score >= 0`
    ).bind(student_id, latest.batch_id).all();
    const attemptCount = tries[0].count;
    if (latest.score >= 9 || attemptCount >= 3) {
      const ids = latest.batch_id.split("-");
      const placeholders = ids.map(() => "?").join(",");
      const stmt2 = env.DB.prepare(
        `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d, choice_e
         FROM questions WHERE id IN (${placeholders})`
      );
      const { results: results2 } = await stmt2.all(...ids);
      return new Response(JSON.stringify({
        batch_id: latest.batch_id,
        questions: results2,
        message: "You\u2019ve already completed this set. A new one will be available next time."
      }), { headers: { "Content-Type": "application/json" } });
    } else {
      const ids = latest.batch_id.split("-");
      const placeholders = ids.map(() => "?").join(",");
      const stmt2 = env.DB.prepare(
        `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d, choice_e
         FROM questions WHERE id IN (${placeholders})`
      );
      const { results: results2 } = await stmt2.all(...ids);
      return new Response(JSON.stringify({
        batch_id: latest.batch_id,
        questions: results2,
        message: "You\u2019re still working on this set. You may submit again if needed."
      }), { headers: { "Content-Type": "application/json" } });
    }
  }
  const stmt = env.DB.prepare(
    `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d, choice_e
     FROM questions ORDER BY RANDOM() LIMIT 10`
  );
  const { results } = await stmt.all();
  const qIds = results.map((q) => q.id);
  const batchId = qIds.join("-");
  const stubAnswers = Object.fromEntries(qIds.map((id) => [id, ""]));
  await env.DB.prepare(
    `INSERT INTO submissions (student_id, answers, score, batch_id)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(student_id, JSON.stringify(stubAnswers), 0, batchId).run();
  return new Response(JSON.stringify({
    batch_id: batchId,
    questions: results,
    message: "Here\u2019s your new set of 10 practice questions. Good luck!"
  }), { headers: { "Content-Type": "application/json" } });
}
__name(getQuestions, "getQuestions");
async function submitAnswers(request, env) {
  const { student_id, answers } = await request.json();
  if (!student_id || !answers) {
    return new Response(JSON.stringify({
      error: "Missing data",
      message: "Please make sure you entered your email and answers."
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const latest = await env.DB.prepare(
    `SELECT batch_id FROM submissions WHERE student_id = ?1
     ORDER BY created_at DESC LIMIT 1`
  ).bind(student_id).first();
  if (!latest) {
    return new Response(JSON.stringify({
      error: "No active batch found",
      message: "Please start a new question set first."
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const batchId = latest.batch_id;
  const { results: attempts } = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM submissions
     WHERE student_id = ?1 AND batch_id = ?2 AND score >= 0`
  ).bind(student_id, batchId).all();
  if (attempts[0].count >= 3) {
    return new Response(JSON.stringify({
      error: "Max attempts reached",
      locked: true,
      message: "This set is complete. You\u2019ve used all your attempts."
    }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  const ids = Object.keys(answers).map((id) => Number(id));
  if (ids.length === 0) {
    return new Response(JSON.stringify({
      error: "No answers submitted",
      message: "Please answer at least one question before submitting."
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const placeholders = ids.map(() => "?").join(",");
  const stmt = env.DB.prepare(
    `SELECT id, correct_choice, skill FROM questions WHERE id IN (${placeholders})`
  );
  const { results } = await stmt.all(...ids);
  let score = 0;
  const missedSkills = /* @__PURE__ */ new Set();
  for (const row of results) {
    if (answers[row.id] === row.correct_choice) {
      score++;
    } else {
      missedSkills.add(row.skill);
    }
  }
  await env.DB.prepare(
    `INSERT INTO submissions (student_id, answers, score, batch_id)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(student_id, JSON.stringify(answers), score, batchId).run();
  let locked = false;
  let message = "";
  if (score >= 9) {
    locked = true;
    message = "Excellent work! You scored 9 or better, so this set is complete.";
  } else {
    const { results: tries } = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM submissions
       WHERE student_id = ?1 AND batch_id = ?2 AND score >= 0`
    ).bind(student_id, batchId).all();
    if (tries[0].count >= 3) {
      locked = true;
      message = "This set is complete. You\u2019ve used all your attempts.";
    } else {
      message = "You can try this set one more time.";
    }
  }
  const summary = missedSkills.size > 0 ? Array.from(missedSkills).map((s) => `Brush up on ${s}`) : ["Great work! No weak areas identified."];
  return new Response(JSON.stringify({ score, summary, locked, message }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(submitAnswers, "submitAnswers");
async function listSubmissions(url, env) {
  const student_id = url.searchParams.get("student_id");
  if (!student_id) {
    return new Response(JSON.stringify({ error: "Missing student_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { results } = await env.DB.prepare(
    `SELECT id, batch_id, score, created_at
     FROM submissions
     WHERE student_id = ?1
     ORDER BY created_at DESC`
  ).bind(student_id).all();
  return new Response(JSON.stringify({ submissions: results }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(listSubmissions, "listSubmissions");
async function listQuestions(url, env) {
  const batch_id = url.searchParams.get("batch_id");
  if (!batch_id) {
    return new Response(JSON.stringify({ error: "Missing batch_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const ids = batch_id.split("-").map((id) => Number(id));
  const placeholders = ids.map(() => "?").join(",");
  const stmt = env.DB.prepare(
    `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d, choice_e, correct_choice, skill
     FROM questions WHERE id IN (${placeholders})`
  );
  const { results } = await stmt.all(...ids);
  return new Response(JSON.stringify({ batch_id, questions: results }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(listQuestions, "listQuestions");

// ../Users/seanm/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../Users/seanm/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-qsFB5m/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../Users/seanm/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-qsFB5m/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
