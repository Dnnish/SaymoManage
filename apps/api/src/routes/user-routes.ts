import type { FastifyPluginAsync } from "fastify";
import { requireRole } from "../plugins/require-role.js";
import { userHandler } from "../handlers/user-handler.js";

const userRoutes: FastifyPluginAsync = async (app) => {
  await app.register(requireRole("superadmin"));

  app.get("/api/users", userHandler.list);
  app.get("/api/users/:id", userHandler.getById);
  app.post("/api/users", userHandler.create);
  app.patch("/api/users/:id", userHandler.update);
  app.patch("/api/users/:id/restore", userHandler.restore);
  app.delete("/api/users/:id", userHandler.remove);
};

export default userRoutes;
