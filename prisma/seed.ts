// Creates a clearly labelled demo account with a few monitors pointing at real
// public endpoints. It does NOT insert any check results: every metric shown
// for these monitors comes from checks the worker actually performs.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@example.com";

const demoMonitors = [
  { name: "[Demo] example.com", url: "https://example.com/", method: "GET" as const, expectedStatus: 200 },
  { name: "[Demo] IANA homepage", url: "https://www.iana.org/", method: "HEAD" as const, expectedStatus: 200 },
  // Returns 404, so it demonstrates a failing monitor and an open incident.
  {
    name: "[Demo] Missing page (expected to fail)",
    url: "https://example.com/pulse-demo-missing-page",
    method: "GET" as const,
    expectedStatus: 200,
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data in production.");
  }

  const password = process.env.SEED_DEMO_PASSWORD || "pulse-demo-password";
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo account",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  const existing = await prisma.monitor.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`Demo account already has ${existing} monitors; nothing to do.`);
    return;
  }

  const monitors = [];
  for (const monitor of demoMonitors) {
    monitors.push(
      await prisma.monitor.create({
        data: { ...monitor, userId: user.id, intervalSeconds: 300, timeoutMs: 10000 },
      }),
    );
  }

  const slugTaken = await prisma.statusPage.findUnique({ where: { slug: "demo" } });
  if (slugTaken) {
    console.log(`Seeded ${monitors.length} demo monitors; /status/demo already exists, so no status page was created.`);
    return;
  }

  await prisma.statusPage.create({
    data: {
      userId: user.id,
      slug: "demo",
      title: "Demo status page",
      description: "Seeded demo data. Results come from real checks run by the local worker.",
      monitors: {
        create: monitors.slice(0, 2).map((monitor, position) => ({ monitorId: monitor.id, position })),
      },
    },
  });

  console.log(`Seeded demo account ${DEMO_EMAIL} with ${monitors.length} monitors and a status page at /status/demo.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
