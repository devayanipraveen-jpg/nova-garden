import { issueForProject, projectGraph, traverse } from "./analysisUtils";

export async function getImpact(projectId: string, issueId: string) {
  const issue = await issueForProject(projectId, issueId); const { byId } = await projectGraph(projectId); const paths = traverse(issue.moduleId, byId as any);
  const affectedModules = [...paths.entries()].map(([id, path]) => ({ moduleId: id, moduleName: byId.get(id)!.name, path, hops: path.length - 1, impact: path.length === 1 ? "DIRECT" : path.length <= 2 ? "HIGH" : "INDIRECT" }));
  return { issueId, originModule: issue.module.name, affectedModules, directImpact: affectedModules.filter((x) => x.hops <= 1), indirectImpact: affectedModules.filter((x) => x.hops > 1), criticalPath: affectedModules.sort((a,b) => b.hops-a.hops)[0]?.path ?? [] };
}
