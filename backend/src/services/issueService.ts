import { prisma } from "../utils/prismaClient";
import { ApiError } from "../middleware/errorHandler";
type IssueStatus = string; type Priority = string; type Severity = string;

export interface CreateIssueInput {
  title: string;
  description: string;
  severity: Severity;
  priority: Priority;
  moduleId: string;
  projectId: string;
  reporterId: string;
}

export async function createIssue(input: CreateIssueInput) {
  const module = await prisma.module.findUnique({ where: { id: input.moduleId } });
  if (!module || module.projectId !== input.projectId) {
    throw new ApiError(400, "Module does not belong to this project");
  }

  return prisma.issue.create({
    data: {
      title: input.title,
      description: input.description,
      severity: input.severity,
      priority: input.priority,
      moduleId: input.moduleId,
      projectId: input.projectId,
      reporterId: input.reporterId,
    },
  });
}

export async function listIssues(projectId: string) {
  return prisma.issue.findMany({
    where: { projectId },
    include: { module: true, reporter: true, assignee: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getIssue(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      module: true,
      reporter: true,
      assignee: true,
      history: { orderBy: { createdAt: "desc" }, include: { changedBy: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: true } },
    },
  });
  if (!issue) throw new ApiError(404, "Issue not found");
  return issue;
}

export interface UpdateIssueInput {
  status?: IssueStatus;
  severity?: Severity;
  priority?: Priority;
  assigneeId?: string | null;
}

/** Updates an issue and writes an IssueHistory row for every field that actually changed. */
export async function updateIssue(issueId: string, changedById: string, input: UpdateIssueInput) {
  const existing = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existing) throw new ApiError(404, "Issue not found");

  const historyRows: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  (["status", "severity", "priority", "assigneeId"] as const).forEach((field) => {
    const newVal = input[field];
    if (newVal !== undefined && newVal !== (existing as any)[field]) {
      historyRows.push({
        field,
        oldValue: (existing as any)[field] ?? null,
        newValue: newVal ?? null,
      });
    }
  });

  const resolvedAt =
    input.status === "RESOLVED" && existing.status !== "RESOLVED" ? new Date() : existing.resolvedAt;

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: { ...input, resolvedAt },
  });

  if (historyRows.length > 0) {
    await prisma.issueHistory.createMany({
      data: historyRows.map((row) => ({ ...row, issueId, changedById })),
    });
  }

  await prisma.activity.create({ data: { projectId: existing.projectId, userId: changedById, type: "ISSUE_UPDATED", message: `${existing.title} updated` } });
  if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
    await prisma.notification.create({ data: { userId: input.assigneeId, projectId: existing.projectId, title: "Issue assigned", body: `You were assigned ${existing.title}.` } });
  }
  if (input.status === "CRITICAL" || (input.severity === "CRITICAL" && existing.severity !== "CRITICAL")) {
    const members = await prisma.projectMember.findMany({ where: { projectId: existing.projectId } });
    await prisma.notification.createMany({ data: members.filter((m) => m.userId !== changedById).map((m) => ({ userId: m.userId, projectId: existing.projectId, title: "Critical ecosystem signal", body: `${existing.title} became critical.` })) });
  }

  return updated;
}
