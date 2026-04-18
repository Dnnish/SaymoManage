import { petRepository } from "../repositories/pet-repository.js";
import { storageService } from "./storage-service.js";
import { imageService } from "./image-service.js";

export const petService = {
  async upload(data: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
    uploadedById: string;
  }) {
    if (!data.mimeType.startsWith("image/")) {
      throw new InvalidPetMimeTypeError(
        `Formato ${data.mimeType} no permitido para PETs. Solo se aceptan imagenes.`,
      );
    }

    let { buffer, mimeType } = data;
    let { filename } = data;

    if (!imageService.isJpeg(mimeType)) {
      buffer = await imageService.convertToJpg(buffer);
      filename = imageService.replaceExtensionWithJpg(filename);
      mimeType = "image/jpeg";
    }

    const storageKey = `pets/${Date.now()}-${filename}`;

    await storageService.upload(storageKey, buffer, mimeType);

    const pet = await petRepository.create({
      filename,
      storageKey,
      mimeType,
      size: buffer.length,
      uploadedById: data.uploadedById,
    });

    return pet;
  },

  async list() {
    return petRepository.findAll();
  },

  async download(id: string) {
    const pet = await petRepository.findById(id);
    if (!pet) return null;

    const stream = await storageService.download(pet.storageKey);
    return { pet, stream };
  },

  async remove(id: string) {
    const pet = await petRepository.findById(id);
    if (!pet) return null;

    await storageService.remove(pet.storageKey);
    await petRepository.deleteById(id);

    return pet;
  },
};

export class InvalidPetMimeTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPetMimeTypeError";
  }
}
