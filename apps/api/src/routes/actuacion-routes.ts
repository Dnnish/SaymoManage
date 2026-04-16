import type { FastifyPluginAsync } from "fastify";
import authenticatePlugin from "../plugins/authenticate.js";
import { actuacionHandler } from "../handlers/actuacion-handler.js";

const actuacionRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  app.get("/api/actuaciones", actuacionHandler.list);
  app.get("/api/actuaciones/:id", actuacionHandler.getById);

  app.post(
    "/api/actuaciones",
    {
      preHandler: async (request, reply) => {
        if (!["superadmin", "admin"].includes(request.user.role)) {
          return reply.code(403).send({ error: "No tienes permisos para esta accion" });
        }
      },
    },
    actuacionHandler.create,
  );

  app.delete("/api/actuaciones/:id", actuacionHandler.remove);
};

export default actuacionRoutes;
