import { Issue, Module } from "@prisma/client";
import { ModuleHealth, ModuleHealthLevel } from "../types";
import { prisma } from "../utils/prismaClient";

// Severity → health-point penalty. Only OPEN/IN_PROGRESS issues count against
// a module — resolved/closed issues don't hurt current health.
const SEVERITY_PENALTY: Record<string, number> = {
  CRITICAL: 25,
  HIGH: 12,
  MEDIUM: 5,
  LOW: 2,
};

function levelForScore(score: number): ModuleHealthLevel {
  if (score >= 80) return "THRIVING";
  if (score >= 55) return "STRESSED";
  if (score >= 30) return "WITHERING";
  return "CRITICAL";
}

/** Transparent projected-risk heuristic based solely on live project data. */
export async function assessRisk(projectId: string, moduleId?: string) {
  const modules = await prisma.module.findMany({ where: { projectId, ...(moduleId ? { id: moduleId } : {}) }, include: { issues: true, dependsOn: true, dependedOnBy: true } });
  const modulesRisk = modules.map((m) => {
    const activeIssues = m.issues.filter((i) => i.status !== "RESOLVED" && i.status !== "PREVENTED" && i.status !== "CLOSED");
    const score = Math.min(100, activeIssues.reduce((s, i) => s + (SEVERITY_PENALTY[i.severity] ?? 0), 0) + (m.dependsOn.length + m.dependedOnBy.length) * 6);
    const level = score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
    return { moduleId: m.id, moduleName: m.name, score, level, reasons: [`${activeIssues.length} active issues`, `${m.dependsOn.length + m.dependedOnBy.length} graph connections`] };
  });
  const score = Math.round(modulesRisk.reduce((s, m) => s + m.score, 0) / Math.max(1, modulesRisk.length));
  const level = score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  await prisma.riskAssessment.create({ data: { projectId, score, level, reasons: JSON.stringify(modulesRisk) } });
  return { riskScore: score, riskLevel: level, reasons: ["Severity-weighted active issues", "Dependency centrality"], modules: modulesRisk, label: "PROJECTED RISK — transparent heuristic, not a scientific prediction." };
}

/**
 * Computes a module's health purely from its live, active issues.
 * No hardcoded numbers — the score is derived from actual DB rows passed in.
 */
export function computeModuleHealth(
  moduleRow: Module,
  issues: Issue[]
): ModuleHealth {
  const active = issues.filter((i) => i.status !== "RESOLVED" && i.status !== "PREVENTED" && i.status !== "CLOSED");

  let score = 100;
  const reasons: string[] = [];

  const bySeverity: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const issue of active) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
    score -= SEVERITY_PENALTY[issue.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  if (bySeverity.CRITICAL > 0) {
    reasons.push(`${bySeverity.CRITICAL} critical issue${bySeverity.CRITICAL > 1 ? "s" : ""} active`);
  }
  if (bySeverity.HIGH > 0) {
    reasons.push(`${bySeverity.HIGH} high-severity issue${bySeverity.HIGH > 1 ? "s" : ""} active`);
  }
  if (bySeverity.MEDIUM > 0) {
    reasons.push(`${bySeverity.MEDIUM} medium-severity issue${bySeverity.MEDIUM > 1 ? "s" : ""} active`);
  }
  if (bySeverity.LOW > 0) {
    reasons.push(`${bySeverity.LOW} low-severity issue${bySeverity.LOW > 1 ? "s" : ""} active`);
  }
  if (active.length === 0) {
    reasons.push("No active issues");
  }

  return {
    moduleId: moduleRow.id,
    moduleName: moduleRow.name,
    healthScore: score,
    level: levelForScore(score),
    openIssueCount: active.length,
    criticalIssueCount: bySeverity.CRITICAL,
    highIssueCount: bySeverity.HIGH,
    reasons,
  };
}
