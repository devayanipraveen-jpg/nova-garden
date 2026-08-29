import bcrypt from "bcryptjs";
import { prisma } from "../utils/prismaClient";
import { signToken } from "../utils/jwt";
import { ApiError } from "../middleware/errorHandler";

const SALT_ROUNDS = 10;

export async function signup(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  const token = signToken({ userId: user.id, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        select: { role: true, project: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}
