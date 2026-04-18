import type { FastifyPluginAsync } from "fastify";

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    // 1. Zod validation errors — check for ZodError by name or by issues array
    if (
      error.name === "ZodError" ||
      (typeof (error as unknown as { issues?: unknown }).issues !== "undefined" &&
        Array.isArray((error as unknown as { issues?: unknown }).issues))
    ) {
      const zodError = error as unknown as {
        issues: Array<{ path: (string | number)[]; message: string }>;
      };
      const details: Record<string, string[]> = {};
      for (const issue of zodError.issues) {
        const field = issue.path.join(".") || "_root";
        if (!details[field]) details[field] = [];
        details[field].push(issue.message);
      }
      return reply.code(400).send({
        error: "Validación fallida",
        details,
      });
    }

    // 2. Fastify built-in validation errors
    if ((error as unknown as { validation?: unknown }).validation) {
      return reply.code(400).send({ error: error.message });
    }

    // 3. PostgreSQL unique constraint violation (pg error code 23505)
    const pgCode = (error as unknown as { code?: string }).code;
    if (pgCode === "23505") {
      return reply.code(409).send({ error: "El registro ya existe" });
    }

    // 4. PostgreSQL foreign key violation (pg error code 23503)
    if (pgCode === "23503") {
      return reply
        .code(409)
        .send({
          error:
            "No se puede completar la operación por dependencias existentes",
        });
    }

    // 5. Errors with a statusCode already set (e.g., thrown with reply.code or createError)
    if (error.statusCode) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    // 6. Unknown errors — log full details, never expose internals
    request.log.error(error);
    return reply.code(500).send({ error: "Error interno del servidor" });
  });
};

export default errorHandlerPlugin;
