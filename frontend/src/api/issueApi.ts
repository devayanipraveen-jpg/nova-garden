import { apiFetch } from "./client";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type IssueStatus = "SEED" | "OPEN" | "IN_PROGRESS" | "SPREAD" | "CRITICAL" | "RESOLVED" | "PREVENTED" | "CLOSED";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  severity: Severity;
  priority: Priority;
  moduleId: string;
  createdAt: string;
}

export function listIssues(projectId: string): Promise<Issue[]> {
  return apiFetch<Issue[]>(`/projects/${projectId}/issues`);
}
export function getIssue(projectId: string, issueId: string): Promise<any> { return apiFetch<any>(`/projects/${projectId}/issues/${issueId}`); }

export function createIssue(
  projectId: string,
  input: { title: string; description: string; moduleId: string; severity: Severity; priority: Priority }
): Promise<Issue> {
  return apiFetch<Issue>(`/projects/${projectId}/issues`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateIssueStatus(
  projectId: string,
  issueId: string,
  status: IssueStatus
): Promise<Issue> {
  return apiFetch<Issue>(`/projects/${projectId}/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
