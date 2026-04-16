import { actuacionRepository } from "../repositories/actuacion-repository.js";

export const actuacionService = {
  async list(page: number, limit: number, search?: string) {
    return actuacionRepository.findAll(page, limit, search);
  },

  async getById(id: string) {
    const actuacion = await actuacionRepository.findById(id);
    if (!actuacion) return null;

    const folderCounts = await actuacionRepository.getDocumentCountsByFolder(id);
    return { ...actuacion, folderCounts };
  },

  async create(name: string, createdById: string) {
    return actuacionRepository.create({ name, createdById });
  },

  async delete(id: string, requesterId: string, requesterRole: string) {
    const actuacion = await actuacionRepository.findById(id);
    if (!actuacion) return null;

    if (requesterRole === "superadmin") {
      await actuacionRepository.deleteById(id);
      return actuacion;
    }

    if (requesterRole === "admin") {
      if (actuacion.createdById !== requesterId) {
        throw new ForbiddenError("No tienes permisos para eliminar esta actuacion");
      }
      await actuacionRepository.deleteById(id);
      return actuacion;
    }

    throw new ForbiddenError("No tienes permisos para eliminar actuaciones");
  },
};

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
