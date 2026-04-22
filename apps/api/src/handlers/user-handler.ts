import type { FastifyRequest, FastifyReply } from "fastify";
import { createUserSchema, updateUserSchema } from "@minidrive/shared";
import { userService, ConflictError, SelfDeleteError, ForbiddenDeleteError, ProtectedAccountError } from "../services/user-service.js";

export const userHandler = {
  async list(
    request: FastifyRequest<{ Querystring: { includeDeleted?: string } }>,
    reply: FastifyReply,
  ) {
    const includeDeleted = request.query.includeDeleted === "true";
    const users = await userService.list(includeDeleted);
    return reply.send(users);
  },

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const user = await userService.getById(request.params.id);
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado" });
    }
    return reply.send(user);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    try {
      const user = await userService.create(parsed.data);
      return reply.code(201).send(user);
    } catch (err) {
      if (err instanceof ConflictError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  },

  async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    try {
      const user = await userService.update(request.params.id, parsed.data);
      if (!user) {
        return reply.code(404).send({ error: "Usuario no encontrado" });
      }
      return reply.send(user);
    } catch (err) {
      if (err instanceof ConflictError) {
        return reply.code(409).send({ error: err.message });
      }
      if (err instanceof ProtectedAccountError) {
        return reply.code(403).send({ error: err.message });
      }
      throw err;
    }
  },

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const user = await userService.softDelete(request.params.id, request.user.id);
      if (!user) {
        return reply.code(404).send({ error: "Usuario no encontrado" });
      }
      return reply.send(user);
    } catch (err) {
      if (err instanceof SelfDeleteError || err instanceof ForbiddenDeleteError || err instanceof ProtectedAccountError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async restore(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const user = await userService.restore(request.params.id);
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado" });
    }
    return reply.send(user);
  },
};
