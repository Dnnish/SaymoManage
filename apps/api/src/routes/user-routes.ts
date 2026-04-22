import type { FastifyPluginAsync } from "fastify";
import { requireRole } from "../plugins/require-role.js";
import authenticatePlugin from "../plugins/authenticate.js";
import { userHandler } from "../handlers/user-handler.js";

const userRoutes: FastifyPluginAsync = async (app) => {
  // Rutas accesibles por cualquier usuario autenticado
  await app.register(async (authenticatedScope) => {
    await authenticatedScope.register(authenticatePlugin);
    authenticatedScope.post("/api/users/me/change-password", userHandler.changePassword);
  });

  // Rutas exclusivas de superadmin
  await app.register(async (adminScope) => {
    await adminScope.register(requireRole("superadmin"));

    adminScope.get("/api/users", userHandler.list);
    adminScope.get("/api/users/:id", userHandler.getById);
    adminScope.post("/api/users", userHandler.create);
    adminScope.patch("/api/users/:id", userHandler.update);
    adminScope.patch("/api/users/:id/restore", userHandler.restore);
    adminScope.post("/api/users/:id/reset-password", userHandler.resetPassword);
    adminScope.delete("/api/users/:id", userHandler.remove);
  });
};

export default userRoutes;
