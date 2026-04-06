import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function usePresets() {
  return useQuery({
    queryKey: [api.presets.list.path],
    queryFn: async () => {
      const res = await fetch(api.presets.list.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return []; // Fallback if API isn't ready
        throw new Error("Failed to fetch presets");
      }
      return api.presets.list.responses[200].parse(await res.json());
    },
  });
}
