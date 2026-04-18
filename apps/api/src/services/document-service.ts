import type { Folder } from "@minidrive/shared";
import { isValidMimeType } from "@minidrive/shared";
import { documentRepository } from "../repositories/document-repository.js";
import { storageService } from "./storage-service.js";

export const documentService = {
  async upload(data: {
    actuacionId: string;
    folder: Folder;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    uploadedById: string;
  }) {
    if (!isValidMimeType(data.folder, data.mimeType)) {
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

  async remove(id: string) {
    const document = await documentRepository.findById(id);
    if (!document) return null;

    await storageService.remove(document.storageKey);
    await documentRepository.deleteById(id);

    return document;
  },
};

export class InvalidMimeTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMimeTypeError";
  }
}
