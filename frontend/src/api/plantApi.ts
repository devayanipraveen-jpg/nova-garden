import { getDemoSessionId, getToken } from "./client";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export interface PlantProjectResult {
  projectId: string;
  projectName: string;
  description: string;
  repositoryUrl?: string;
  summary: {
    totalBugs: number;
    bySeverity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    moduleCount: number;
    modules: {
      name: string;
      healthScore: number;
      level: string;
      bugCount: number;
    }[];
    healthScore: number;
    mostCriticalRoot: string;
    highestImpactBug: string;
    stages: string[];
    scanDurationMs: number;
  };
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  role: string;
  moduleCount: number;
  openIssueCount: number;
  createdAt: string;
}

export async function fetchProjects(): Promise<ProjectItem[]> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/projects`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token ? { "X-Nova-Demo-Session": getDemoSessionId() } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to fetch projects");
  }
  return res.json();
}

export async function plantProjectZip(file: File, projectName?: string): Promise<PlantProjectResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  if (projectName) formData.append("projectName", projectName);

  const res = await fetch(`${API_BASE}/projects/plant/zip`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token ? { "X-Nova-Demo-Session": getDemoSessionId() } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to plant project from ZIP");
  }

  return res.json();
}

export async function plantProjectUrl(
  repositoryUrl: string,
  projectName?: string,
  branch?: string
): Promise<PlantProjectResult> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/projects/plant/url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token ? { "X-Nova-Demo-Session": getDemoSessionId() } : {}),
    },
    body: JSON.stringify({ repositoryUrl, projectName, branch }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to plant project from URL");
  }

  return res.json();
}

export async function exportProjectAnalysis(projectId: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/projects/${projectId}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : { "X-Nova-Demo-Session": getDemoSessionId() },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to export project analysis");
  }

  return res.blob();
}
