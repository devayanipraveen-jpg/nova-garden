import { PrismaClient } from "@prisma/client";

// A single shared Prisma client instance across the app (avoids exhausting
// DB connections in dev with hot-reload).
export const prisma = new PrismaClient();
