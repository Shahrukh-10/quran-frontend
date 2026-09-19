// Typed accessor for reading-plan seed data in data/plans/.
// The catalog (index.json) is imported statically; individual plan JSON files
// are loaded on demand via dynamic import so bundlers can split them.

import indexData from "@/data/plans/index.json";

export type PlanDay = {
  day: number;
  title: string;
  juz?: number;
  surah?: number;
  reflection: string;
};

export type Plan = {
  id: string;
  name: string;
  description: string;
  totalDays: number;
  days: PlanDay[];
};

export type PlanIndexRow = {
  id: string;
  name: string;
  totalDays: number;
  tags: string[];
};

export function getAllPlans(): PlanIndexRow[] {
  return indexData as PlanIndexRow[];
}

export async function getPlanById(id: string): Promise<Plan | undefined> {
  switch (id) {
    case "quran-in-a-month": {
      const mod = await import("@/data/plans/quran-in-a-month.json");
      return mod.default as Plan;
    }
    case "quran-in-ramadan": {
      const mod = await import("@/data/plans/quran-in-ramadan.json");
      return mod.default as Plan;
    }
    case "last-tenth": {
      const mod = await import("@/data/plans/last-tenth.json");
      return mod.default as Plan;
    }
    default:
      return undefined;
  }
}
