import { db, actuaciones, users, documents } from "@minidrive/db";
import { eq, desc, count, sql } from "drizzle-orm";

export const actuacionRepository = {
  async findAll(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;

    const searchFilter = search
      ? sql`(similarity(${actuaciones.name}, ${search}) > 0.1 OR ${actuaciones.name} ILIKE ${'%' + search + '%'})`
      : undefined;

    const orderBy = search
      ? sql`similarity(${actuaciones.name}, ${search}) DESC`
      : desc(actuaciones.createdAt);

    const baseQuery = db
      .select({
        id: actuaciones.id,
        name: actuaciones.name,
        createdById: actuaciones.createdById,
        createdByName: users.name,
        coliseoStatus: actuaciones.coliseoStatus,
        createdAt: actuaciones.createdAt,
        updatedAt: actuaciones.updatedAt,
      })
      .from(actuaciones)
      .innerJoin(users, eq(actuaciones.createdById, users.id));

    const countQuery = db.select({ total: count() }).from(actuaciones);

    const [data, totalResult] = await Promise.all([
      searchFilter
        ? baseQuery.where(searchFilter).orderBy(orderBy).limit(limit).offset(offset)
        : baseQuery.orderBy(orderBy).limit(limit).offset(offset),
      searchFilter
        ? countQuery.where(searchFilter)
        : countQuery,
    ]);

    return { data, total: totalResult[0]?.total ?? 0 };
  },

  async findById(id: string) {
    const result = await db
      .select({
        id: actuaciones.id,
        name: actuaciones.name,
        createdById: actuaciones.createdById,
        createdByName: users.name,
        coliseoStatus: actuaciones.coliseoStatus,
        createdAt: actuaciones.createdAt,
        updatedAt: actuaciones.updatedAt,
      })
      .from(actuaciones)
      .innerJoin(users, eq(actuaciones.createdById, users.id))
      .where(eq(actuaciones.id, id))
      .limit(1);

    return result[0] ?? null;
  },

  async getDocumentCountsByFolder(actuacionId: string): Promise<Record<string, number>> {
    const rows = await db
      .select({
        folder: documents.folder,
        total: count(),
      })
      .from(documents)
      .where(eq(documents.actuacionId, actuacionId))
      .groupBy(documents.folder);

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.folder] = row.total;
    }
    return result;
  },

  async create(data: { name: string; createdById: string }) {
    const result = await db
      .insert(actuaciones)
      .values(data)
      .returning();
    return result[0];
  },

  async deleteById(id: string) {
    await db.delete(actuaciones).where(eq(actuaciones.id, id));
  },
};
