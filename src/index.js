// src/index.js — Math ACT Worker with email login, 2-attempt limit, score ≥ 9 auto-lock
// + debug endpoints protected by ADMIN_KEY

export default {
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
  },
};

// ------------------------------
// Helper: Admin Key Check
// ------------------------------
function checkAdminKey(request, env) {
  const keyFromHeader = request.headers.get("x-admin-key");
  return keyFromHeader && keyFromHeader === env.ADMIN_KEY;
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

// ------------------------------
// POST /questions
// ------------------------------
async function getQuestions(request, env) {
  const { student_id } = await request.json();

  if (!student_id) {
    return new Response(JSON.stringify({
      error: "Missing student_id",
      message: "Please enter your email before starting."
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Get latest submission for this student
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
      const stmt = env.DB.prepare(
        `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d, choice_e
         FROM questions WHERE id IN (${placeholders})`
      );
      const { results } = await stmt.all(...ids);

      return new Response(JSON.stringify({
        batch_id: latest.batch_id,
        questions: results,
        message: "You’ve already completed this set. A new one will be available next time."
      }), { headers: { "Content-Type": "application/json" } });
    } else {
      const ids = latest.batch_id.split("-");
      const placeholders = ids.map(() => "?").join(",");
      const stmt = env.DB.prepare(
        `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d, choice_e
         FROM questions WHERE id IN (${placeholders})`
      );
      const { results } = await stmt.all(...ids);

      return new Response(JSON.stringify({
        batch_id: latest.batch_id,
        questions: results,
        message: "You’re still working on this set. You may submit again if needed."
      }), { headers: { "Content-Type": "application/json" } });
    }
  }

  // Otherwise → generate a new batch
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
    message: "Here’s your new set of 10 practice questions. Good luck!"
  }), { headers: { "Content-Type": "application/json" } });
}

// ------------------------------
// POST /submit
// ------------------------------
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
      message: "This set is complete. You’ve used all your attempts."
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
  const missedSkills = new Set();
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
      message = "This set is complete. You’ve used all your attempts.";
    } else {
      message = "You can try this set one more time.";
    }
  }

  const summary = missedSkills.size > 0
    ? Array.from(missedSkills).map((s) => `Brush up on ${s}`)
    : ["Great work! No weak areas identified."];

  return new Response(JSON.stringify({ score, summary, locked, message }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ------------------------------
// GET /debug/submissions?student_id=... (admin only)
// ------------------------------
async function listSubmissions(url, env) {
  const student_id = url.searchParams.get("student_id");

  if (!student_id) {
    return new Response(JSON.stringify({ error: "Missing student_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, batch_id, score, created_at
     FROM submissions
     WHERE student_id = ?1
     ORDER BY created_at DESC`
  ).bind(student_id).all();

  return new Response(JSON.stringify({ submissions: results }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ------------------------------
// GET /debug/questions?batch_id=... (admin only)
// ------------------------------
async function listQuestions(url, env) {
  const batch_id = url.searchParams.get("batch_id");

  if (!batch_id) {
    return new Response(JSON.stringify({ error: "Missing batch_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
  });
}
