// src/index.js — Math ACT Worker with HTML frontend + API endpoints

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // === Frontend page ===
    if (url.pathname === "/math-act" || url.pathname === "/math-act/") {
      return serveFrontend();
    }

    // === API endpoints ===
    if (url.pathname === "/math-act/questions" && request.method === "POST") {
      return await getQuestions(request, env);
    }

    if (url.pathname === "/math-act/submit" && request.method === "POST") {
      return await submitAnswers(request, env);
    }

    // === Debug (admin only) ===
    if (url.pathname === "/math-act/debug/submissions" && request.method === "GET") {
      if (!checkAdminKey(request, env)) return unauthorized();
      return await listSubmissions(request, env);
    }

    if (url.pathname === "/math-act/debug/questions" && request.method === "GET") {
      if (!checkAdminKey(request, env)) return unauthorized();
      return await listQuestions(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ------------------------------
// Serve HTML frontend
// ------------------------------
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
  </script>
</body>
</html>
  `;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

// ------------------------------
// Helper: Admin key check
// ------------------------------
function checkAdminKey(request, env) {
  const keyFromHeader = request.headers.get("x-admin-key");
  return keyFromHeader && keyFromHeader === env.ADMIN_KEY;
}
function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

// ... keep your getQuestions, submitAnswers, listSubmissions, listQuestions functions ...
