import { prisma } from "../utils/prismaClient";
import { issueForProject, overlap } from "./analysisUtils";

export async function getBugDna(projectId: string, issueId: string) {
  const issue = await issueForProject(projectId, issueId);
  const candidates = await prisma.issue.findMany({ where: { projectId, id: { not: issueId } }, include: { module: true } });
  const related = candidates.map((other) => {
    const text = overlap(`${issue.title} ${issue.description}`, `${other.title} ${other.description}`);
    const moduleMatch = other.moduleId === issue.moduleId ? 0.35 : 0;
    const statusMatch = other.status === "RESOLVED" || other.status === "PREVENTED" ? 0.05 : 0;
    const score = Math.min(1, text.score * 0.6 + moduleMatch + statusMatch);
    return { issueId: other.id, title: other.title, status: other.status, module: other.module.name, score: Math.round(score * 100), sharedKeywords: text.shared };
  }).filter((x) => x.score > 0).sort((a,b) => b.score - a.score).slice(0, 6);
  return { issueId, methodology: "Local keyword, module, and historical-status similarity", related, sharedModule: issue.module.name };
}
