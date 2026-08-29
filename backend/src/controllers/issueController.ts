import { Request, Response, NextFunction } from "express";
import * as issueService from "../services/issueService";
import { createIssueSchema, updateIssueSchema } from "../validators/schemas";

export async function listIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const issues = await issueService.listIssues(req.params.projectId);
    res.status(200).json(issues);
  } catch (err) {
    next(err);
  }
}

export async function getIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const issue = await issueService.getIssue(req.params.issueId);
    res.status(200).json(issue);
  } catch (err) {
    next(err);
  }
}

export async function createIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createIssueSchema.parse(req.body);
    const issue = await issueService.createIssue({
      ...input,
      projectId: req.params.projectId,
      reporterId: req.user!.userId,
    });
    res.status(201).json(issue);
  } catch (err) {
    next(err);
  }
}

export async function updateIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateIssueSchema.parse(req.body);
    const issue = await issueService.updateIssue(req.params.issueId, req.user!.userId, input);
    res.status(200).json(issue);
  } catch (err) {
    next(err);
  }
}
