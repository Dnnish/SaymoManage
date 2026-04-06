import type { FastifyPluginAsync } from "fastify";
import authenticatePlugin from "../plugins/authenticate.js";

const authRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  app.get("/api/auth/me", async (request) => {
    return request.user;
  });
};

export default authRoutes;
