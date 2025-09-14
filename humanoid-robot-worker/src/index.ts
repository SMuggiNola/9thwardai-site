function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // Handle preflight (CORS) requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Handle quiz submissions
    if (request.method === "POST" && url.pathname === "/submit") {
      try {
        const data: any = await request.json();

        const key = `${Date.now()}_${data.student_id || "unknown"}`;
        await env.SUBMISSIONS.put(key, JSON.stringify(data));

        return new Response(
          JSON.stringify({ message: "Humanoid Robot quiz received & saved!" }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
            status: 200,
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid submission" }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
            status: 400,
          }
        );
      }
    }

    // Teacher-only: fetch all submissions
    if (request.method === "GET" && url.pathname === "/submissions") {
      const list = await env.SUBMISSIONS.list();
      const results: any[] = [];

      for (const item of list.keys) {
        const value = await env.SUBMISSIONS.get(item.name);
        if (value) {
          results.push(JSON.parse(value));
        }
      }

      return new Response(JSON.stringify(results, null, 2), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(origin),
    });
  },
};
