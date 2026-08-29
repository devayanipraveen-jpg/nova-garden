import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";
import { signupSchema, loginSchema } from "../validators/schemas";

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const input = signupSchema.parse(req.body);
    const result = await authService.signup(input.name, input.email, input.password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input.email, input.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
