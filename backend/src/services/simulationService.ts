import { prisma } from "../utils/prismaClient";
import { getImpact } from "./impactAnalysisService";
import { issueForProject, severityWeight } from "./analysisUtils";
export async function runSimulation(projectId: string, issueId: string, durationDays: number) {
 const issue = await issueForProject(projectId, issueId); const impact = await getImpact(projectId, issueId);
 const results = impact.affectedModules.map((m) => ({ moduleId: m.moduleId, moduleName: m.moduleName, hop: m.hops, projectedRisk: Math.min(100, severityWeight(issue.severity) + durationDays * 3 - m.hops * 5), path: JSON.stringify(m.path) }));
 const projectedRisk = Math.round(results.reduce((s,r) => s+r.projectedRisk,0) / Math.max(1, results.length));
 const simulation = await prisma.simulation.create({ data: { projectId, issueId, durationDays, projectedRisk, results: { create: results } }, include: { results: true } });
 return { ...simulation, label: "PROJECTED IMPACT — simulation, not a guarantee." };
}
