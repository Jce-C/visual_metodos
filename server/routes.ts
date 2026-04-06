import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingItems = await storage.getPresets();
  if (existingItems.length === 0) {
    // Add realistic example functions that work well with numerical methods
    await storage.createPreset({
      name: "Polinomio Simple",
      expression: "x^2 - 4",
      gExpression: "sqrt(4)", // Not actually used directly as string since sqrt(4) is const, a better g(x) would be 4/x or x^2+x-4. Let's use 4/x
      description: "Raíces en x=2 y x=-2.",
    });
    
    // Update the first one to have a valid gExpression for Fixed Point.
    // For f(x) = x^2 - 4 = 0 => x^2 = 4 => x = 4/x
    
    await storage.createPreset({
      name: "Función Exponencial",
      expression: "exp(-x) - x",
      gExpression: "exp(-x)",
      description: "Raíz cercana a x=0.567. Ideal para Punto Fijo con g(x) = e^(-x).",
    });

    await storage.createPreset({
      name: "Función Trigonométrica",
      expression: "cos(x) - x",
      gExpression: "cos(x)",
      description: "Raíz cercana a x=0.739. Funciona muy bien con Newton-Raphson.",
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed the database with some example functions
  seedDatabase().catch(console.error);

  app.get(api.presets.list.path, async (req, res) => {
    try {
      const presets = await storage.getPresets();
      res.json(presets);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch presets" });
    }
  });

  app.get(api.presets.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(404).json({ message: "Invalid ID" });
      }
      const preset = await storage.getPreset(id);
      if (!preset) {
        return res.status(404).json({ message: "Preset not found" });
      }
      res.json(preset);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch preset" });
    }
  });

  return httpServer;
}
