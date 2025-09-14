export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Accept quiz submissions at /submit
    if (request.method === "POST" && url.pathname === "/submit") {
      try {
        const data = await request.json();

        console.log("Humanoid Robot Quiz submission:", JSON.stringify(data));

        return new Response(
          JSON.stringify({ message: "Humanoid Robot quiz received!" }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid submission" }),
          { headers: { "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Anything else returns 404
    return new Response("Not found", { status: 404 });
  },
};
