import { Request, Response, NextFunction } from "express";
import { getGardenView } from "../services/gardenService";

export async function getGarden(req: Request, res: Response, next: NextFunction) {
  try {
    const garden = await getGardenView(req.params.projectId);
    res.status(200).json(garden);
  } catch (err) {
    next(err);
  }
}
