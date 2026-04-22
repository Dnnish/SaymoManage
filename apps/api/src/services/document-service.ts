import type { Folder } from "@minidrive/shared";
import { isValidMimeType } from "@minidrive/shared";
import { documentRepository } from "../repositories/document-repository.js";
import { actuacionRepository } from "../repositories/actuacion-repository.js";
import { storageService } from "./storage-service.js";
import { zipService } from "./zip-service.js";

export const documentService = {
  async upload(data: {
    actuacionId: string;
    folder: Folder;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    uploadedById: string;
  }) {
    if (!isValidMimeType(data.folder, data.mimeType, data.filename)) {
      throw new InvalidMimeTypeError(
        `Formato ${data.mimeType} no permitido para la carpeta ${data.folder}`,
      );
    }

    const { buffer, filename, mimeType } = data;

    const storageKey = `${data.actuacionId}/${data.folder}/${Date.now()}-${filename}`;

    await storageService.upload(storageKey, buffer, mimeType);

    const document = await documentRepository.create({
      actuacionId: data.actuacionId,
      folder: data.folder,
      filename,
      storageKey,
      mimeType,
      size: buffer.length,
      uploadedById: data.uploadedById,
    });

    return document;
  },

  async listByFolder(actuacionId: string, folder: string) {
    return documentRepository.findByActuacionAndFolder(actuacionId, folder);
  },

  async download(id: string) {
    const document = await documentRepository.findById(id);
    if (!document) return null;

    const stream = await storageService.download(document.storageKey);
    return { document, stream };
  },

  async downloadFolder(actuacionId: string, folder: string) {
    const docs = await documentRepository.findByActuacionAndFolder(actuacionId, folder);
    if (docs.length === 0) return null;

    const entries = docs.map((doc) => ({
      filename: doc.filename,
      storageKey: doc.storageKey,
    }));

    return {
      folderName: folder,
      stream: zipService.createZipStream(entries),
    };
  },

  async downloadActuacion(actuacionId: string) {
    const [actuacion, docs] = await Promise.all([
      actuacionRepository.findById(actuacionId),
      documentRepository.findByActuacion(actuacionId),
    ]);
    if (docs.length === 0) return null;

    const entries = docs.map((doc) => ({
      filename: `${doc.folder}/${doc.filename}`,
      storageKey: doc.storageKey,
    }));

    return {
      name: actuacion?.name ?? "actuacion",
      stream: zipService.createZipStream(entries),
    };
  },

  async bulkDownload(ids: string[]) {
    const docs = await documentRepository.findByIds(ids);
    if (docs.length === 0) return null;

    const entries = docs.map((doc) => ({
      filename: doc.filename,
      storageKey: doc.storageKey,
    }));

    return zipService.createZipStream(entries);
  },

  async bulkRemove(ids: string[]) {
    const docs = await documentRepository.findByIds(ids);
    if (docs.length === 0) return [];

    await Promise.all(docs.map((doc) => storageService.remove(doc.storageKey)));
    await documentRepository.deleteByIds(ids);

    return docs;
  },

  async remove(id: string, requester: { id: string; role: string }) {
    const document = await documentRepository.findById(id);
    if (!document) return null;

    if (requester.role === "user") {
      if (document.uploadedById !== requester.id) {
        throw new ForbiddenError("Solo puedes eliminar archivos que hayas subido tú");
      }
      const uploadedAt = new Date(document.uploadedAt).getTime();
      const elapsed = Date.now() - uploadedAt;
      if (elapsed > 30 * 60 * 1000) {
        throw new ForbiddenError("Solo puedes eliminar archivos dentro de los primeros 30 minutos tras subirlos");
      }
    }

    await storageService.remove(document.storageKey);
    await documentRepository.deleteById(id);

    return document;
  },

  async reorder(items: { id: string; sortOrder: number }[]) {
    await documentRepository.reorder(items);
  },
};

export class InvalidMimeTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMimeTypeError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
