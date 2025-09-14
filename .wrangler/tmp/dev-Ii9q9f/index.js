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
    if (url.pathname === "/math-act" || url.pathname === "/math-act/") {
      return serveFrontend();
    }
    if (url.pathname === "/math-act/questions" && request.method === "POST") {
      return await getQuestions(request, env);
    }
    if (url.pathname === "/math-act/submit" && request.method === "POST") {
      return await submitAnswers(request, env);
    }
    if (url.pathname === "/math-act/debug/submissions" && request.method === "GET") {
      if (!checkAdminKey(request, env)) return unauthorized();
      return await listSubmissions(request, env);
    }
    if (url.pathname === "/math-act/debug/questions" && request.method === "GET") {
      if (!checkAdminKey(request, env)) return unauthorized();
      return await listQuestions(request, env);
    }
    return new Response("Not Found", { status: 404 });
  }
};
function serveFrontend() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mini Math ACT Practice</title>
  <style>
    body { background:black; color:#00ff99; font-family:"Courier New", monospace; padding:20px; }
    h1 { text-align:center; }
    .question { margin:20px 0; }
    button { background:#00ff99; border:none; padding:10px 20px; cursor:pointer; }
  </style>
</head>
<body>
  <h1>Mini Math ACT Practice</h1>
  <div id="quiz"></div>
  <button onclick="submitAnswers()">Submit</button>
  <pre id="result"></pre>

  <script>
    let batchId = null;
    let questions = [];

    async function loadQuestions() {
      const res = await fetch("/math-act/questions", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ student_id: "demo@student.org" }) // TODO: replace with login
      });
      const data = await res.json();
      batchId = data.batch_id;
      questions = data.questions;
      const quizDiv = document.getElementById("quiz");
      quizDiv.innerHTML = "";
      questions.forEach((q, i) => {
        const div = document.createElement("div");
        div.className = "question";
        div.innerHTML = \`
          <p>\${i+1}) \${q.prompt}</p>
          <label><input type="radio" name="q\${q.id}" value="A"> A) \${q.choice_a}</label><br>
          <label><input type="radio" name="q\${q.id}" value="B"> B) \${q.choice_b}</label><br>
          <label><input type="radio" name="q\${q.id}" value="C"> C) \${q.choice_c}</label><br>
          <label><input type="radio" name="q\${q.id}" value="D"> D) \${q.choice_d}</label><br>
          <label><input type="radio" name="q\${q.id}" value="E"> E) \${q.choice_e}</label>
        \`;
        quizDiv.appendChild(div);
      });
    }

    async function submitAnswers() {
      const answers = {};
      questions.forEach(q => {
        const choice = document.querySelector("input[name=q"+q.id+"]:checked");
        if (choice) answers[q.id] = choice.value;
      });
      const res = await fetch("/math-act/submit", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ student_id: "demo@student.org", answers })
      });
      const data = await res.json();
      document.getElementById("result").textContent = JSON.stringify(data, null, 2);
    }

    loadQuestions();
  <\/script>
</body>
</html>
  `;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
__name(serveFrontend, "serveFrontend");
function checkAdminKey(request, env) {
  const keyFromHeader = request.headers.get("x-admin-key");
  return keyFromHeader && keyFromHeader === env.ADMIN_KEY;
}
__name(checkAdminKey, "checkAdminKey");
function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
}
__name(unauthorized, "unauthorized");

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
