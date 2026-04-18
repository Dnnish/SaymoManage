import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import authenticatePlugin from "../plugins/authenticate.js";
import { petHandler } from "../handlers/pet-handler.js";

const petRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit
  await app.register(authenticatePlugin);

  // Upload a PET image (all authenticated users)
  app.post("/api/pets", petHandler.upload);

  // List all PETs (all authenticated users)
  app.get("/api/pets", petHandler.list);

  // Download a PET file (all authenticated users)
  app.get("/api/pets/:id/download", petHandler.download);

  // Delete a PET (admin and superadmin only)
  app.delete(
    "/api/pets/:id",
    {
      preHandler: async (request, reply) => {
        if (!["superadmin", "admin"].includes(request.user.role)) {
          return reply.code(403).send({ error: "No tienes permisos para esta accion" });
        }
      },
    },
    petHandler.remove,
  );
};

export default petRoutes;
