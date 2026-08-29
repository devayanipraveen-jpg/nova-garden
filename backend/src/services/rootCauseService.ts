import { prisma } from "../utils/prismaClient";
import { getImpact } from "./impactAnalysisService";
import { issueForProject } from "./analysisUtils";

export async function investigateRootCause(projectId: string, issueId: string) {
 const issue = await issueForProject(projectId, issueId); const impact = await getImpact(projectId, issueId);
 const historical = await prisma.issue.findMany({ where: { projectId, moduleId: issue.moduleId, status: { in: ["RESOLVED", "PREVENTED"] } }, take: 5, orderBy: { resolvedAt: "desc" } });
 const rootCause = historical[0]?.description ?? `Failure centred in ${issue.module.name}; dependency paths require investigation.`;
 const evidence = [`Reported: ${issue.title}`, `${issue.history.length} lifecycle events`, `${issue.comments.length} investigation comments`, `${impact.affectedModules.length} connected modules`];
 const analysis = await prisma.bugAnalysis.upsert({ where: { issueId }, update: { rootCause, confidence: Math.min(.9, .4 + issue.history.length*.05 + historical.length*.06), evidence: JSON.stringify(evidence), affectedDependencies: JSON.stringify(impact.affectedModules.map((m) => m.moduleName)) }, create: { issueId, rootCause, confidence: Math.min(.9, .4 + issue.history.length*.05 + historical.length*.06), evidence: JSON.stringify(evidence), affectedDependencies: JSON.stringify(impact.affectedModules.map((m) => m.moduleName)) } });
 return { ...analysis, evidence, affectedDependencies: impact.affectedModules, label: "Prototype assessment — evidence-based, not a guaranteed cause." };
}
