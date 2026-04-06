import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const presetFunctions = pgTable("preset_functions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  expression: text("expression").notNull(),
  gExpression: text("g_expression"), // Used for Fixed Point method
  description: text("description"),
});

export const insertPresetSchema = createInsertSchema(presetFunctions).omit({ id: true });

export type PresetFunction = typeof presetFunctions.$inferSelect;
export type InsertPresetFunction = z.infer<typeof insertPresetSchema>;
