import { petFolderRepository } from "../repositories/pet-folder-repository.js";
import { petRepository } from "../repositories/pet-repository.js";
import { storageService } from "./storage-service.js";
import { zipService } from "./zip-service.js";

function generateFolderName(): string {
  return new Date()
    .toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}

export const petFolderService = {
  async create(createdById: string) {
    const name = generateFolderName();
    return petFolderRepository.create({ name, createdById });
  },

  async list() {
    return petFolderRepository.findAll();
  },

  async getById(id: string) {
    return petFolderRepository.findById(id);
  },

  async rename(id: string, name: string) {
    const folder = await petFolderRepository.findById(id);
    if (!folder) return null;
    return petFolderRepository.updateName(id, name);
  },

  async remove(id: string) {
    const folder = await petFolderRepository.findById(id);
    if (!folder) return null;

    const petsInFolder = await petRepository.findAllByFolderId(id);

    await Promise.allSettled(
      petsInFolder.map((pet) => storageService.remove(pet.storageKey)),
    );

    await petRepository.deleteByFolderId(id);
    await petFolderRepository.deleteById(id);
    return folder;
  },

  async toggleColiseo(id: string, status: boolean) {
    const folder = await petFolderRepository.updateColiseoStatus(id, status);
    return folder;
  },

  async downloadZip(id: string) {
    const folder = await petFolderRepository.findById(id);
    if (!folder) return null;

    const petsInFolder = await petRepository.findAllByFolderId(id);
    if (petsInFolder.length === 0) return null;

    const entries = petsInFolder.map((pet) => ({
      filename: pet.filename,
      storageKey: pet.storageKey,
    }));

    return {
      folder,
      stream: zipService.createZipStream(entries),
    };
  },
};
