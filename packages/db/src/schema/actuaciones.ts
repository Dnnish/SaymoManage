import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "./users";

export const actuaciones = pgTable("actuaciones", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: varchar("name", { length: 500 }).notNull(),
  createdById: varchar("created_by_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  coliseoStatus: boolean("coliseo_status").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
