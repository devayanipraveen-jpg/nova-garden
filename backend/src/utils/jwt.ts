import jwt from "jsonwebtoken";
import { JwtPayload } from "../types";

function loadSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fail loudly at startup rather than silently signing tokens with `undefined`.
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env and set it.");
  }
  return secret;
}

const SECRET: string = loadSecret();

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as unknown as JwtPayload;
}
