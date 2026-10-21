import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);

const createdUserIds: string[] = [];

export async function createUser() {
  const user = await prisma.user.create({
    data: {
      email: `test-${randomUUID()}@example.com`,
      name: "Test user",
      // Not a real hash: these tests never sign in through Auth.js.
      passwordHash: "not-used",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

export function createMonitor(userId: string, data: Partial<Prisma.MonitorUncheckedCreateInput> = {}) {
  return prisma.monitor.create({
    data: {
      userId,
      name: "Test monitor",
      url: "https://example.com/",
      ...data,
    },
  });
}

/** Deleting the users cascades to everything else the tests created. */
export async function deleteCreatedUsers() {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}
