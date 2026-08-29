import { Issue, Module, Prisma } from "@prisma/client";
import { prisma } from "../utils/prismaClient";
import { ApiError } from "../middleware/errorHandler";

export const active = (i: Issue) => !["RESOLVED", "PREVENTED", "CLOSED"].includes(i.status);
export const severityWeight = (s: string) => ({ LOW: 8, MEDIUM: 18, HIGH: 32, CRITICAL: 48 }[s] ?? 10);
export const words = (text: string) => new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? []);
export function overlap(a: string, b: string) {
  const x = words(a), y = words(b); const shared = [...x].filter((w) => y.has(w));
  return { score: x.size || y.size ? shared.length / new Set([...x, ...y]).size : 0, shared };
}

export async function issueForProject(projectId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId }, include: { module: true, history: { orderBy: { createdAt: "asc" } }, comments: true } });
  if (!issue) throw new ApiError(404, "Issue not found in this project");
  return issue;
}

export async function projectGraph(projectId: string) {
  const modules = await prisma.module.findMany({ where: { projectId }, include: { dependsOn: true, dependedOnBy: true, issues: true } });
  const byId = new Map(modules.map((m) => [m.id, m]));
  return { modules, byId };
}

/** Traverses both the dependency and dependant direction, retaining an explainable path. */
export function traverse(startId: string, byId: Map<string, Module & { dependsOn: { dependencyModuleId: string }[]; dependedOnBy: { dependentModuleId: string }[] }>) {
  const visited = new Map<string, string[]>(); const queue: [string, string[]][] = [[startId, [startId]]]; visited.set(startId, [startId]);
  while (queue.length) {
    const [id, path] = queue.shift()!; const m = byId.get(id); if (!m) continue;
    const next = [...m.dependsOn.map((d) => d.dependencyModuleId), ...m.dependedOnBy.map((d) => d.dependentModuleId)];
    for (const n of next) if (!visited.has(n)) { const p = [...path, n]; visited.set(n, p); queue.push([n, p]); }
  }
  return visited;
}

export const json = (value: Prisma.JsonValue) => value;
