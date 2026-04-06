import { db } from "./db";
import { presetFunctions, type InsertPresetFunction, type PresetFunction } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getPresets(): Promise<PresetFunction[]>;
  getPreset(id: number): Promise<PresetFunction | undefined>;
  createPreset(preset: InsertPresetFunction): Promise<PresetFunction>;
}

export class DatabaseStorage implements IStorage {
  async getPresets(): Promise<PresetFunction[]> {
    return await db.select().from(presetFunctions);
  }

  async getPreset(id: number): Promise<PresetFunction | undefined> {
    const [preset] = await db.select().from(presetFunctions).where(eq(presetFunctions.id, id));
    return preset;
  }

  async createPreset(preset: InsertPresetFunction): Promise<PresetFunction> {
    const [newPreset] = await db.insert(presetFunctions).values(preset).returning();
    return newPreset;
  }
}

export const storage = new DatabaseStorage();
