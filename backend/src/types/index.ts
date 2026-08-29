export type Role = "OWNER" | "ADMIN" | "DEVELOPER" | "REPORTER";

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthedRequest extends Express.Request {
  user?: JwtPayload;
}

export type ModuleHealthLevel = "THRIVING" | "STRESSED" | "WITHERING" | "CRITICAL";

export interface ModuleHealth {
  moduleId: string;
  moduleName: string;
  healthScore: number; // 0-100
  level: ModuleHealthLevel;
  openIssueCount: number;
  criticalIssueCount: number;
  highIssueCount: number;
  reasons: string[];
}

export const ROLE_RANK: Record<Role, number> = {
  REPORTER: 0,
  DEVELOPER: 1,
  ADMIN: 2,
  OWNER: 3,
};
