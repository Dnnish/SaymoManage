import type { FastifyPluginAsync } from "fastify";
import { auth } from "../lib/auth.js";

const authPlugin: FastifyPluginAsync = async (app) => {
  app.all("/api/auth/*", async (request, reply) => {
    const url = `http://localhost:${process.env.API_PORT ?? 3001}${request.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const body = request.method !== "GET" && request.method !== "HEAD"
      ? JSON.stringify(request.body)
      : undefined;

    const webRequest = new Request(url, {
      method: request.method,
      headers,
      body,
    });

    const response = await auth.handler(webRequest);

    reply.status(response.status);
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    const text = await response.text();
    return reply.send(text);
  });
};

export default authPlugin;
