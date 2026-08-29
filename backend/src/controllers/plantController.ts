import { Request, Response, NextFunction } from "express";
import { extractZipFiles, fetchGithubRepo, plantProject } from "../services/projectAnalysisService";
import { prisma } from "../utils/prismaClient";
import { ApiError } from "../middleware/errorHandler";

export async function plantZip(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(400, "Please upload a valid .zip codebase archive");
    }

    const originalName = req.file.originalname.replace(/\.zip$/i, "").trim();
    const projectName = req.body.projectName?.trim() || originalName || "Planted Project";

    const files = extractZipFiles(req.file.buffer);
    const result = await plantProject(projectName, files, req.user!.userId);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function plantUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { repositoryUrl, projectName, branch } = req.body;
    if (!repositoryUrl || typeof repositoryUrl !== "string") {
      throw new ApiError(400, "Please provide a valid repository URL");
    }

    const { buffer, repoName } = await fetchGithubRepo(repositoryUrl, branch);
    const finalProjectName = (projectName && projectName.trim()) || repoName || "Planted Repository";

    const files = extractZipFiles(buffer);
    const result = await plantProject(finalProjectName, files, req.user!.userId, repositoryUrl);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user!.userId },
      include: {
        project: {
          include: {
            modules: true,
            issues: {
              where: {
                status: {
                  in: ["OPEN", "IN_PROGRESS", "SPREAD", "CRITICAL"],
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const projects = memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      repositoryUrl: m.project.repositoryUrl,
      role: m.role,
      moduleCount: m.project.modules.length,
      openIssueCount: m.project.issues.length,
      createdAt: m.project.createdAt,
    }));

    res.json(projects);
  } catch (err) {
    next(err);
  }
}

/** Exports persisted analysis data only; uploaded source files are never retained or returned. */
export async function exportProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: req.params.projectId },
      include: {
        modules: true,
        issues: { include: { analysis: true, preventions: true } },
        healthSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
        riskAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    res.setHeader("Content-Disposition", `attachment; filename="${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "nova-garden"}-analysis.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        repositoryUrl: project.repositoryUrl,
        createdAt: project.createdAt,
      },
      modules: project.modules,
      issues: project.issues.map(({ analysis, ...issue }) => ({
        ...issue,
        analysis: analysis
          ? {
              ...analysis,
              evidence: JSON.stringify(["Evidence is available in the private dashboard and omitted from exports to protect source content."]),
            }
          : null,
      })),
      projectHealth: project.healthSnapshots[0] ?? null,
      riskAssessment: project.riskAssessments[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
}
