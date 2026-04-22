import type { FastifyRequest, FastifyReply } from "fastify";
import { petFolderService } from "../services/pet-folder-service.js";

export const petFolderHandler = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const folder = await petFolderService.create(request.user.id);
    return reply.code(201).send(folder);
  },

  async list(_request: FastifyRequest, reply: FastifyReply) {
    const folders = await petFolderService.list();
    return reply.send(folders);
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { folderId } = request.params as { folderId: string };
    const folder = await petFolderService.getById(folderId);
    if (!folder) {
      return reply.code(404).send({ error: "Carpeta no encontrada" });
    }
    return reply.send(folder);
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { folderId } = request.params as { folderId: string };
    const folder = await petFolderService.remove(folderId);
    if (!folder) {
      return reply.code(404).send({ error: "Carpeta no encontrada" });
    }
    return reply.send(folder);
  },

  async rename(request: FastifyRequest, reply: FastifyReply) {
    const { folderId } = request.params as { folderId: string };
    const { name } = request.body as { name: string };
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es requerido" });
    }
    if (name.trim().length > 50) {
      return reply.code(400).send({ error: "El nombre no puede superar 50 caracteres" });
    }

    const folder = await petFolderService.rename(folderId, name.trim());
    if (!folder) {
      return reply.code(404).send({ error: "Carpeta no encontrada" });
    }
    return reply.send(folder);
  },

  async updateColiseo(request: FastifyRequest, reply: FastifyReply) {
    const { folderId } = request.params as { folderId: string };
    const { status } = request.body as { status: boolean };
    if (typeof status !== "boolean") {
      return reply
        .code(400)
        .send({ error: "El campo status es requerido y debe ser booleano" });
    }

    const folder = await petFolderService.toggleColiseo(folderId, status);
    if (!folder) {
      return reply.code(404).send({ error: "Carpeta no encontrada" });
    }
    return reply.send(folder);
  },

  async downloadZip(request: FastifyRequest, reply: FastifyReply) {
    const { folderId } = request.params as { folderId: string };
    const result = await petFolderService.downloadZip(folderId);
    if (!result) {
      return reply.code(404).send({ error: "Carpeta no encontrada o vacía" });
    }

    const zipName = `PETs-${result.folder.name}.zip`;
    return reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${zipName}"`)
      .send(result.stream);
  },
};
