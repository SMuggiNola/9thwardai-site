// Change this line to match your Worker deployment
const WORKER_URL = "https://quiz-worker.sean-muggivan.workers.dev";

let studentEmail = "";

async function login() {
  const email = document.getElementById("email").value;
  const pin = document.getElementById("pin").value;
  const res = await fetch(`${WORKER_URL}/login`, {   // 👈 updated
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pin }),
  });

  if (res.ok) {
    studentEmail = email;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("quiz").classList.remove("hidden");
    loadQuestions();
  } else {
    document.getElementById("login-status").innerText = await res.text();
  }
}

async function loadQuestions() {
  const res = await fetch("questions.json");
  const data = await res.json();
  const container = document.getElementById("quiz-container");

  data.questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.classList.add("question");
    div.innerHTML = `<p>${i + 1}. ${q.text}</p>`;

    if (q.type === "mc") {
      q.options.forEach((opt) => {
        div.innerHTML += `
          <label>
            <input type="radio" name="q${i}" value="${opt}">
            ${opt}
          </label><br>`;
      });
    } else if (q.type === "tf") {
      div.innerHTML += `
        <label><input type="radio" name="q${i}" value="True"> True</label><br>
        <label><input type="radio" name="q${i}" value="False"> False</label><br>`;
    } else if (q.type === "short") {
      div.innerHTML += `<textarea name="q${i}" rows="3" cols="50"></textarea>`;
    }

    container.appendChild(div);
  });
}

async function submitQuiz(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const answers = {};
  formData.forEach((val, key) => (answers[key] = val));

  const res = await fetch(`${WORKER_URL}/submit`, {   // 👈 updated
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: studentEmail, answers }),
  });

  alert(await res.text());
  location.reload();
}
