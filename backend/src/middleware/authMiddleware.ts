import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { JwtPayload, ROLE_RANK, Role } from "../types";
import { prisma } from "../utils/prismaClient";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const DEMO_SESSION_PATTERN = /^[a-f0-9-]{36}$/i;

/** Attaches a browser-scoped anonymous identity when a visitor has not signed in. */
export async function attachDemoUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice("Bearer ".length));
      return next();
    } catch {}
  }

  try {
    const providedSession = req.header("X-Nova-Demo-Session");
    const sessionId = providedSession && DEMO_SESSION_PATTERN.test(providedSession) ? providedSession : crypto.randomUUID();
    const demoEmail = `demo+${sessionId}@nova.garden`;
    const demoUser = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: {
        name: "Nova Garden Demo",
        email: demoEmail,
        passwordHash: "demo-user-not-for-login",
      },
    });
    req.user = { userId: demoUser.id, email: demoUser.email };
    next();
  } catch (err) {
    next(err);
  }
}

/** Verifies the Authorization: Bearer <token> header and attaches req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Enforces a minimum project role. Must run after requireAuth.
 * Looks up the caller's ProjectMember row for :projectId in the URL —
 * permissions are always checked server-side, never inferred from the client.
 */
export function requireProjectRole(minRole: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    const projectId = req.params.projectId;
    if (!projectId) return res.status(400).json({ error: "projectId missing from route" });

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "Not a member of this project" });
    }

    if (ROLE_RANK[membership.role as Role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: `Requires ${minRole} role or higher` });
    }

    next();
  };
}
