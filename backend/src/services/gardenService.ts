import { Module, Issue, ModuleDependency } from "@prisma/client";
import { prisma } from "../utils/prismaClient";
import { computeModuleHealth } from "./riskAssessmentService";
import { ApiError } from "../middleware/errorHandler";

type ModuleWithRelations = Module & { issues: Issue[]; dependsOn: ModuleDependency[] };

export interface GardenEdge {
  fromModuleId: string;
  toModuleId: string;
}

export interface GardenView {
  projectId: string;
  projectName: string;
  modules: ReturnType<typeof computeModuleHealth>[];
  edges: GardenEdge[];
  overallHealth: number;
}

/**
 * Builds the full ecosystem snapshot for a project: every module's live
 * health plus the dependency graph that the garden renders as roots.
 * Everything here comes from the database — nothing is hardcoded.
 */
export async function getGardenView(projectId: string): Promise<GardenView> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError(404, "Project not found");

  const modules = await prisma.module.findMany({
    where: { projectId },
    include: {
      issues: true,
      dependsOn: true,
    },
  });

  const typedModules = modules as ModuleWithRelations[];

  const moduleHealths = typedModules.map((m) => computeModuleHealth(m, m.issues));

  const edges: GardenEdge[] = typedModules.flatMap((m) =>
    m.dependsOn.map((dep: ModuleDependency) => ({
      fromModuleId: m.id,
      toModuleId: dep.dependencyModuleId,
    }))
  );

  const overallHealth =
    moduleHealths.length === 0
      ? 100
      : Math.round(
          moduleHealths.reduce((sum: number, m: { healthScore: number }) => sum + m.healthScore, 0) /
            moduleHealths.length
        );

  return {
    projectId: project.id,
    projectName: project.name,
    modules: moduleHealths,
    edges,
    overallHealth,
  };
}
