import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createIssueSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(1),
  moduleId: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const updateIssueSchema = z.object({
  status: z.enum(["SEED", "OPEN", "IN_PROGRESS", "SPREAD", "CRITICAL", "RESOLVED", "PREVENTED", "CLOSED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

export const simulationSchema = z.object({ durationDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)]) });
export const commentSchema = z.object({ body: z.string().min(1).max(5000) });
