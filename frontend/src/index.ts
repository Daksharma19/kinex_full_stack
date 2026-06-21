import { serve, file } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Serve static files referenced by runtime path (e.g. data-driven product
    // and service images under assets/images/...). These are looked up by path
    // from JSON, so they aren't part of the bundler's import graph — we serve
    // them straight from the assets folder. build.ts copies this folder into
    // dist/ so the same /assets/... paths work in production.
    "/assets/*": async (req) => {
      const pathname = new URL(req.url).pathname; // e.g. /assets/images/serv/9.png
      const f = file(`.${pathname}`);
      return (await f.exists())
        ? new Response(f)
        : new Response("Not found", { status: 404 });
    },

    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
