import { prisma } from "../utils/prismaClient";
import { issueForProject } from "./analysisUtils";
import { getImpact } from "./impactAnalysisService";
export async function runAutopsy(projectId: string, issueId: string) {
 const issue = await issueForProject(projectId, issueId); if (!["RESOLVED","PREVENTED","CLOSED"].includes(issue.status)) throw new Error("Resolve the issue before running an autopsy");
 const impact = await getImpact(projectId, issueId); const hours = ((issue.resolvedAt ?? new Date()).getTime() - issue.createdAt.getTime()) / 36e5;
 return prisma.bugAutopsy.upsert({ where: { issueId }, update: {}, create: { issueId, originModuleId: issue.moduleId, causeOfFailure: issue.description, affectedModules: JSON.stringify(impact.affectedModules.map((m) => m.moduleName)), whyItSurvived: issue.comments.length ? "Detection followed investigation comments; add an automated regression check." : "No investigation comment was recorded before resolution.", resolution: issue.history.find((h) => h.field === "status" && h.newValue === "RESOLVED")?.newValue ?? "Resolved through the issue workflow.", preventionRecommendation: "Add a regression test, monitoring signal, and documented runbook.", timeActiveHours: Math.round(hours * 10) / 10 } });
}
