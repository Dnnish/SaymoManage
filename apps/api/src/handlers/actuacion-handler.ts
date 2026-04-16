import type { FastifyRequest, FastifyReply } from "fastify";
import { paginationSchema, createActuacionSchema } from "@minidrive/shared";
import { actuacionService, ForbiddenError } from "../services/actuacion-service.js";

export const actuacionHandler = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const { page, limit } = parsed.data;
    const { data, total } = await actuacionService.list(page, limit);
    return reply.send({ data, total, page, limit });
  },

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const actuacion = await actuacionService.getById(request.params.id);
    if (!actuacion) {
      return reply.code(404).send({ error: "Actuacion no encontrada" });
    }
    return reply.send(actuacion);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createActuacionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const actuacion = await actuacionService.create(parsed.data.name, request.user.id);
    return reply.code(201).send(actuacion);
  },

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const actuacion = await actuacionService.delete(
        request.params.id,
        request.user.id,
        request.user.role,
      );
      if (!actuacion) {
        return reply.code(404).send({ error: "Actuacion no encontrada" });
      }
      return reply.send(actuacion);
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return reply.code(403).send({ error: err.message });
      }
      throw err;
    }
  },
};
