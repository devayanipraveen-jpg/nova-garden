import { ModuleHealth, ModuleHealthLevel } from "../api/gardenApi";

export interface PlantVisual {
  stemColor: string;
  leafColor: string;
  heightRatio: number; // 0-1, drives stem height
  leafCount: number;
  weedCount: number; // one per open issue, capped for legibility
  wilted: boolean;
}

const LEVEL_COLORS: Record<ModuleHealthLevel, { stem: string; leaf: string }> = {
  THRIVING: { stem: "#3E5C3F", leaf: "#6E9B5C" },
  STRESSED: { stem: "#7A7A45", leaf: "#A9A85B" },
  WITHERING: { stem: "#8C6B3E", leaf: "#B98F52" },
  CRITICAL: { stem: "#6B4230", leaf: "#B4562F" },
};

/** Pure function: DB-derived health -> visual plant properties. No randomness, no hardcoded scores. */
export function healthToPlantVisual(health: ModuleHealth): PlantVisual {
  const colors = LEVEL_COLORS[health.level];
  return {
    stemColor: colors.stem,
    leafColor: colors.leaf,
    heightRatio: Math.max(0.25, health.healthScore / 100),
    leafCount: Math.max(2, Math.round((health.healthScore / 100) * 4)),
    weedCount: Math.min(6, health.openIssueCount),
    wilted: health.level === "CRITICAL" || health.level === "WITHERING",
  };
}

export interface LayoutNode {
  moduleId: string;
  x: number;
  y: number;
}

/** Simple deterministic circular layout so modules keep a stable position across re-renders. */
export function layoutModules(moduleIds: string[], width: number, height: number): LayoutNode[] {
  const cx = width / 2;
  const cy = height / 2 + 40;
  const radius = Math.min(width, height) / 2.6;

  return moduleIds.map((moduleId, i) => {
    const angle = (i / moduleIds.length) * Math.PI * 2 - Math.PI / 2;
    return {
      moduleId,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle) * 0.6, // flatten vertically for a garden-bed feel
    };
  });
}
