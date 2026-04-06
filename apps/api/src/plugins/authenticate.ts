import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

const authenticatePlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("user", null);

  app.addHook("preHandler", async (request: FastifyRequest, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.raw.headers),
    });

    if (!session?.user) {
      return reply.code(401).send({ error: "No autenticado" });
    }

    const user = session.user as AuthUser & { deletedAt?: string | null };

    if (user.deletedAt) {
      return reply.code(401).send({ error: "Usuario eliminado" });
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  });
};

export default fp(authenticatePlugin, {
  name: "authenticate",
});
