import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import authenticatePlugin from "../plugins/authenticate.js";
import { documentHandler } from "../handlers/document-handler.js";

const documentRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit
  await app.register(authenticatePlugin);

  // Upload document to actuacion folder
  app.post("/api/actuaciones/:actuacionId/documents", documentHandler.upload);

  // List documents by folder
  app.get("/api/actuaciones/:actuacionId/documents", documentHandler.list);

  // Download ALL documents in an actuacion as ZIP (with subfolders)
  app.get("/api/actuaciones/:actuacionId/download", documentHandler.downloadActuacion);

  // Download all documents in a single folder as ZIP
  app.get("/api/actuaciones/:actuacionId/documents/download", documentHandler.downloadFolder);

  // Reorder documents within a folder
  app.patch("/api/documents/reorder", documentHandler.reorder);

  // Bulk download documents as ZIP
  app.post("/api/documents/bulk-download", documentHandler.bulkDownload);

  // Bulk delete documents (admin/superadmin only)
  app.post(
    "/api/documents/bulk-delete",
    {
      preHandler: async (request, reply) => {
        if (!["superadmin", "admin"].includes(request.user.role)) {
          return reply.code(403).send({ error: "No tienes permisos para esta accion" });
        }
      },
    },
    documentHandler.bulkRemove,
  );

  // Download single document
  app.get("/api/documents/:id/download", documentHandler.download);

  // Delete document (admin/superadmin always; user only within 30 min of own upload)
  app.delete("/api/documents/:id", documentHandler.remove);
};

export default documentRoutes;
