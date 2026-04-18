import type { FastifyRequest, FastifyReply } from "fastify";
import { petService, InvalidPetMimeTypeError } from "../services/pet-service.js";

export const petHandler = {
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "No se envio ningun archivo" });
    }

    const buffer = await file.toBuffer();

    try {
      const pet = await petService.upload({
        filename: file.filename,
        mimeType: file.mimetype,
        buffer,
        uploadedById: request.user.id,
      });

      return reply.code(201).send(pet);
    } catch (err) {
      if (err instanceof InvalidPetMimeTypeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async list(_request: FastifyRequest, reply: FastifyReply) {
    const pets = await petService.list();
    return reply.send(pets);
  },

  async download(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const result = await petService.download(request.params.id);
    if (!result) {
      return reply.code(404).send({ error: "PET no encontrado" });
    }

    const { pet, stream } = result;

    return reply
      .header("Content-Type", pet.mimeType)
      .header("Content-Disposition", `attachment; filename="${pet.filename}"`)
      .send(stream);
  },

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const pet = await petService.remove(request.params.id);
    if (!pet) {
      return reply.code(404).send({ error: "PET no encontrado" });
    }
    return reply.send(pet);
  },
};
