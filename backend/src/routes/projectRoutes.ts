import { Router } from "express";
import multer from "multer";
import { attachDemoUser } from "../middleware/authMiddleware";
import { getGarden } from "../controllers/gardenController";
import * as issueController from "../controllers/issueController";
import * as intel from "../controllers/intelligenceController";
import * as plantController from "../controllers/plantController";
import { prisma } from "../utils/prismaClient";
import { ROLE_RANK, Role } from "../types";

const router = Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

// Visitors can plant and explore a project without signing in. Authenticated users retain their identity.
router.use(attachDemoUser);

router.get("/", plantController.listProjects);
router.post("/plant/zip", upload.single("file"), plantController.plantZip);
router.post("/plant/url", plantController.plantUrl);

router.param("projectId", async (req, res, next, projectId) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  try {
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "Not a member of this project" });
    }

    if (ROLE_RANK[membership.role as Role] < ROLE_RANK["REPORTER"]) {
      return res.status(403).json({ error: "Requires REPORTER role or higher" });
    }

    next();
  } catch (err) {
    next(err);
  }
});

router.get("/:projectId/garden", getGarden);
router.get("/:projectId/export", plantController.exportProject);

router.get("/:projectId/issues", issueController.listIssues);
router.post("/:projectId/issues", issueController.createIssue);
router.get("/:projectId/issues/:issueId", issueController.getIssue);
router.patch("/:projectId/issues/:issueId", issueController.updateIssue);
router.post("/:projectId/issues/:issueId/comments", intel.addComment);
router.get("/:projectId/issues/:issueId/dna", intel.bugDna);
router.get("/:projectId/issues/:issueId/impact", intel.impactRadius);
router.get("/:projectId/issues/:issueId/root-cause", intel.rootCause);
router.post("/:projectId/issues/:issueId/simulations", intel.simulate);
router.get("/:projectId/issues/:issueId/evolution", intel.evolutionState);
router.post("/:projectId/issues/:issueId/autopsy", intel.autopsyReport);
router.get("/:projectId/issues/:issueId/memory", intel.codebaseMemory);
router.get("/:projectId/issues/:issueId/preventions", intel.getPreventions);
router.post("/:projectId/issues/:issueId/preventions/:preventionId/complete", intel.completePrevention);
router.get("/:projectId/issues/:issueId/recommendation", intel.developers);
router.get("/:projectId/risk", intel.risk);
router.get("/:projectId/season", intel.season);
router.get("/:projectId/health", intel.health);
router.get("/:projectId/analytics", intel.analytics);
router.get("/:projectId/notifications", intel.listNotifications);
router.patch("/:projectId/notifications/:notificationId/read", intel.readNotification);

export default router;
