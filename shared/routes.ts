import { z } from 'zod';
import { insertPresetSchema, presetFunctions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  presets: {
    list: {
      method: 'GET' as const,
      path: '/api/presets' as const,
      responses: {
        200: z.array(z.custom<typeof presetFunctions.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/presets/:id' as const,
      responses: {
        200: z.custom<typeof presetFunctions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  // In a real app we might also evaluate the math expression on backend,
  // but for an interactive visualizer, evaluating functions (math.js) in the frontend is best.
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type PresetListResponse = z.infer<typeof api.presets.list.responses[200]>;
