import type { FastifyRequest, FastifyReply } from "fastify";
import { folderSchema } from "@minidrive/shared";
import type { Folder } from "@minidrive/shared";
import {
  documentService,
  InvalidMimeTypeError,
  ForbiddenError,
} from "../services/document-service.js";

export const documentHandler = {
  async upload(
    request: FastifyRequest<{ Params: { actuacionId: string } }>,
    reply: FastifyReply,
  ) {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "No se envio ningun archivo" });
    }

    const folderField = file.fields.folder;
    // multipart fields come as objects with a value property
    const folderValue =
      folderField && typeof folderField === "object" && "value" in folderField
        ? (folderField as { value: string }).value
        : undefined;

    const folderParsed = folderSchema.safeParse(folderValue);
    if (!folderParsed.success) {
      return reply.code(400).send({ error: "Carpeta invalida o no especificada" });
    }

    const buffer = await file.toBuffer();

    try {
      const document = await documentService.upload({
        actuacionId: request.params.actuacionId,
        folder: folderParsed.data as Folder,
        filename: file.filename,
        mimeType: file.mimetype,
        buffer,
        uploadedById: request.user.id,
      });

      return reply.code(201).send(document);
    } catch (err) {
      if (err instanceof InvalidMimeTypeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async list(
    request: FastifyRequest<{
      Params: { actuacionId: string };
      Querystring: { folder?: string };
    }>,
    reply: FastifyReply,
  ) {
    const { folder } = request.query;
    if (!folder) {
      return reply.code(400).send({ error: "El parametro folder es requerido" });
    }

    const folderParsed = folderSchema.safeParse(folder);
    if (!folderParsed.success) {
      return reply.code(400).send({ error: "Carpeta invalida" });
    }

    const docs = await documentService.listByFolder(
      request.params.actuacionId,
      folderParsed.data,
    );
    return reply.send(docs);
  },

  async download(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const result = await documentService.download(request.params.id);
    if (!result) {
      return reply.code(404).send({ error: "Documento no encontrado" });
    }

    const { document, stream } = result;

    return reply
      .header("Content-Type", document.mimeType)
      .header(
        "Content-Disposition",
        `attachment; filename="${document.filename}"`,
      )
      .send(stream);
  },

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const document = await documentService.remove(request.params.id, request.user);
      if (!document) {
        return reply.code(404).send({ error: "Documento no encontrado" });
      }
      return reply.send(document);
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return reply.code(403).send({ error: err.message });
      }
      throw err;
    }
  },

  async downloadActuacion(request: FastifyRequest, reply: FastifyReply) {
    const { actuacionId } = request.params as { actuacionId: string };

    const result = await documentService.downloadActuacion(actuacionId);
    if (!result) {
      return reply.code(404).send({ error: "No hay documentos en esta actuación" });
    }

    const zipName = `${result.name}.zip`;
    return reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${zipName}"`)
      .send(result.stream);
  },

  async bulkDownload(request: FastifyRequest, reply: FastifyReply) {
    const { ids } = request.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: "Se requiere un array de IDs" });
    }

    const stream = await documentService.bulkDownload(ids);
    if (!stream) {
      return reply.code(404).send({ error: "No se encontraron documentos" });
    }

    return reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="documentos.zip"`)
      .send(stream);
  },

  async bulkRemove(request: FastifyRequest, reply: FastifyReply) {
    const { ids } = request.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: "Se requiere un array de IDs" });
    }

    const removed = await documentService.bulkRemove(ids);
    return reply.send({ deleted: removed.length });
  },

  async reorder(request: FastifyRequest, reply: FastifyReply) {
    const { items } = request.body as { items?: { id: string; sortOrder: number }[] };
    if (!items || !Array.isArray(items)) {
      return reply.code(400).send({ error: "Se requiere un array de items con id y sortOrder" });
    }
    await documentService.reorder(items);
    return reply.send({ ok: true });
  },

  async downloadFolder(request: FastifyRequest, reply: FastifyReply) {
    const { actuacionId } = request.params as { actuacionId: string };
    const { folder } = request.query as { folder?: string };

    if (!folder) {
      return reply.code(400).send({ error: "El parametro folder es requerido" });
    }

    const folderParsed = folderSchema.safeParse(folder);
    if (!folderParsed.success) {
      return reply.code(400).send({ error: "Carpeta invalida" });
    }

    const result = await documentService.downloadFolder(actuacionId, folderParsed.data);
    if (!result) {
      return reply.code(404).send({ error: "No hay documentos en esta carpeta" });
    }

    const zipName = `${result.folderName}.zip`;
    return reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${zipName}"`)
      .send(result.stream);
  },
};
