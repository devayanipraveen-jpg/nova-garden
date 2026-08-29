import { apiFetch } from "./client";

export type ModuleHealthLevel = "THRIVING" | "STRESSED" | "WITHERING" | "CRITICAL";

export interface ModuleHealth {
  moduleId: string;
  moduleName: string;
  healthScore: number;
  level: ModuleHealthLevel;
  openIssueCount: number;
  criticalIssueCount: number;
  highIssueCount: number;
  reasons: string[];
}

export interface GardenEdge {
  fromModuleId: string;
  toModuleId: string;
}

export interface GardenView {
  projectId: string;
  projectName: string;
  modules: ModuleHealth[];
  edges: GardenEdge[];
  overallHealth: number;
}

export function fetchGarden(projectId: string): Promise<GardenView> {
  return apiFetch<GardenView>(`/projects/${projectId}/garden`);
}
