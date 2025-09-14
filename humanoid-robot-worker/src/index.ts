export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle quiz submission
    if (request.method === "POST" && url.pathname === "/submit") {
      try {
        const data = await request.json();

        // Unique key for each submission
        const key = `${Date.now()}_${data.student_id || "unknown"}`;

        // Save submission in KV
        await env.SUBMISSIONS.put(key, JSON.stringify(data));

        return new Response(
          JSON.stringify({ message: "Humanoid Robot quiz received & saved!" }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid submission" }),
          { headers: { "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Teacher-only: retrieve all submissions
    if (request.method === "GET" && url.pathname === "/submissions") {
      const list = await env.SUBMISSIONS.list();
      const results: any[] = [];
      for (const item of list.keys) {
        const value = await env.SUBMISSIONS.get(item.name);
        if (value) {
          results.push(JSON.parse(value));
        }
      }
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
