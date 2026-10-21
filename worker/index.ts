import { prisma } from "@/lib/db";
import { runHttpCheck } from "@/lib/monitoring/http-check";
import {
  claimDueMonitors,
  pruneOldChecks,
  recordCheckResult,
  type ClaimedMonitor,
} from "@/lib/monitoring/jobs";

const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE ?? 10);
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let stopping = false;

async function processClaim(claim: ClaimedMonitor) {
  const checkedAt = new Date();
  try {
    const outcome = await runHttpCheck(claim);
    const result = await recordCheckResult(claim, outcome, checkedAt);
    const summary = outcome.ok
      ? `up ${outcome.statusCode} in ${outcome.responseTimeMs} ms`
      : `down: ${outcome.error}`;
    console.log(
      `[worker] ${claim.id} ${summary}${result === "stale" ? " (discarded, lease lost)" : ""}`,
    );
  } catch (error) {
    // Isolated per monitor: a database error here leaves the lease in place,
    // so the monitor is retried after the lease expires and the rest of the
    // batch is unaffected.
    console.error(`[worker] failed to process monitor ${claim.id}`, error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(
    `[worker] started (batch size ${BATCH_SIZE}, poll ${POLL_INTERVAL_MS} ms)`,
  );
  let lastPrune = 0;

  while (!stopping) {
    try {
      if (Date.now() - lastPrune > PRUNE_INTERVAL_MS) {
        const removed = await pruneOldChecks();
        if (removed > 0) console.log(`[worker] pruned ${removed} old checks`);
        lastPrune = Date.now();
      }

      const claims = await claimDueMonitors(BATCH_SIZE);
      if (claims.length === 0) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      await Promise.all(claims.map(processClaim));
    } catch (error) {
      console.error("[worker] loop error", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await prisma.$disconnect();
  console.log("[worker] stopped");
}

// Finish the checks already in flight before exiting, so their results are
// recorded instead of waiting for the lease to expire.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} received, finishing current batch`);
    stopping = true;
  });
}

main().catch((error) => {
  console.error("[worker] fatal error", error);
  process.exit(1);
});
