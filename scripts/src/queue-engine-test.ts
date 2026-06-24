/**
 * Queue Engine Test
 *
 * Verifies queue intelligence calculations for:
 * - Hospital
 * - Bank
 * - Government Office
 *
 * Tests: token progress, ETA estimation, queue gap calculation.
 *
 * Usage: npx tsx scripts/src/queue-engine-test.ts
 */

import { db, tasksTable, usersTable, runnersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TEST_USER_PHONE = "9999999900";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

// Replicate the backend computation logic for standalone testing
function computeQueueIntelligence(tokenNumber?: string | null, currentToken?: string | null) {
  const token = parseInt(tokenNumber || "", 10);
  const current = parseInt(currentToken || "", 10);
  const gap = !isNaN(token) && !isNaN(current) && currentToken && tokenNumber
    ? Math.max(0, token - current)
    : null;
  const estimatedWait = gap != null && !isNaN(gap) ? Math.round(gap * 1.5) : null;
  const progress = !isNaN(token) && !isNaN(current) && token > 0 && currentToken && tokenNumber
    ? Math.max(0, Math.min(100, Math.round((current / token) * 100)))
    : null;
  return { queueGap: gap, estimatedWaitMinutes: estimatedWait, queueProgressPercent: progress };
}

async function run() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  QUEUE ENGINE TEST — Hospital, Bank, Govt Office");
  console.log("═══════════════════════════════════════════════\n");

  // 1. Find test user
  const [testUser] = await db.select().from(usersTable).where(eq(usersTable.phone, TEST_USER_PHONE));
  assert(!!testUser, "Test user found");

  if (!testUser) {
    console.log("⚠️  Seed data not found. Run seed first.");
    process.exit(1);
  }

  // 2. Test scenarios
  const scenarios = [
    // [category, tokenNumber, currentToken, expectedGap, expectedWait, expectedProgress, description]
    { cat: "hospital", token: "50", current: "30", gap: 20, wait: 30, progress: 60, desc: "Hospital: 20 ahead, 30min wait, 60% progress" },
    { cat: "hospital", token: "50", current: "50", gap: 0, wait: 0, progress: 100, desc: "Hospital: Current called (0 ahead)" },
    { cat: "hospital", token: "50", current: "10", gap: 40, wait: 60, progress: 20, desc: "Hospital: 40 ahead, 60min wait" },
    { cat: "bank", token: "100", current: "45", gap: 55, wait: 83, progress: 45, desc: "Bank: 55 ahead, ~83min wait" },
    { cat: "bank", token: "100", current: "99", gap: 1, wait: 2, progress: 99, desc: "Bank: Almost there (1 ahead)" },
    { cat: "govt_office", token: "30", current: "15", gap: 15, wait: 23, progress: 50, desc: "Govt: Halfway there" },
    { cat: "govt_office", token: "30", current: "0", gap: 30, wait: 45, progress: 0, desc: "Govt: Just started (token 0)" },
    { cat: "hospital", token: null, current: "30", gap: null, wait: null, progress: null, desc: "Edge: No token number" },
    { cat: "bank", token: "50", current: null, gap: null, wait: null, progress: null, desc: "Edge: No current token" },
    { cat: "govt_office", token: "", current: "", gap: null, wait: null, progress: null, desc: "Edge: Empty strings" },
  ];

  console.log("📝 Test 1: Queue intelligence calculation engine...\n");

  for (const s of scenarios) {
    const result = computeQueueIntelligence(s.token, s.current);
    const gapOk = result.queueGap === s.gap;
    const waitOk = result.estimatedWaitMinutes === s.wait;
    const progressOk = result.queueProgressPercent === s.progress;

    if (gapOk && waitOk && progressOk) {
      console.log(`  ✅ ${s.desc}`);
      passed++;
    } else {
      console.error(`  ❌ ${s.desc}`);
      console.error(`     Expected: gap=${s.gap}, wait=${s.wait}, progress=${s.progress}`);
      console.error(`     Got:      gap=${result.queueGap}, wait=${result.estimatedWaitMinutes}, progress=${result.queueProgressPercent}`);
      failed++;
    }
  }

  // 3. Test via DB — create tasks with queue data and verify storage/retrieval
  console.log("\n📝 Test 2: Database storage and retrieval...\n");

  const queueCategories = ["hospital", "bank", "govt_office"];
  const dbTaskIds: number[] = [];

  for (const cat of queueCategories) {
    const [task] = await db.insert(tasksTable).values({
      userId: testUser.id,
      category: cat,
      description: `Queue engine test - ${cat}`,
      status: "in_progress",
      urgency: "normal",
      locationCity: "Ahmedabad",
      tokenNumber: cat === "hospital" ? "50" : cat === "bank" ? "100" : "30",
      currentToken: cat === "hospital" ? "30" : cat === "bank" ? "45" : "15",
      queueGap: cat === "hospital" ? 20 : cat === "bank" ? 55 : 15,
      estimatedWaitMinutes: cat === "hospital" ? 30 : cat === "bank" ? 83 : 23,
      queueProgressPercent: cat === "hospital" ? 60 : cat === "bank" ? 45 : 50,
      basePrice: "149",
      price: "149",
      runnerEarning: "104",
      platformFee: "45",
      paymentMethod: "online",
      otp: String(100000 + Math.floor(Math.random() * 900000)),
    }).returning();
    dbTaskIds.push(task.id);
    assert(!!task, `${cat}: Task created with ID ${task.id}`);
  }

  // Read back and verify
  for (let i = 0; i < dbTaskIds.length; i++) {
    const cat = queueCategories[i];
    const [retrieved] = await db.select().from(tasksTable).where(eq(tasksTable.id, dbTaskIds[i]));
    assert(!!retrieved, `${cat}: Task retrieved`);
    if (retrieved) {
      assert(retrieved.tokenNumber !== null, `${cat}: tokenNumber stored`);
      assert(retrieved.currentToken !== null, `${cat}: currentToken stored`);
      assert(retrieved.queueGap !== null, `${cat}: queueGap stored`);
      assert(retrieved.estimatedWaitMinutes !== null, `${cat}: estimatedWaitMinutes stored`);
      assert(retrieved.queueProgressPercent !== null, `${cat}: queueProgressPercent stored`);
    }
  }

  // 4. Update queue progress and verify
  console.log("\n📝 Test 3: Queue progress updates...\n");

  {
    const [hospitalTask] = await db
      .update(tasksTable)
      .set({
        currentToken: "40",
        queueGap: 10,
        estimatedWaitMinutes: 15,
        queueProgressPercent: 80,
      })
      .where(eq(tasksTable.id, dbTaskIds[0]))
      .returning();

    assert(hospitalTask.currentToken === "40", "Hospital current token updated to 40");
    assert(hospitalTask.queueGap === 10, "Hospital queue gap updated to 10");
    assert(hospitalTask.estimatedWaitMinutes === 15, "Hospital wait updated to 15 min");
    assert(hospitalTask.queueProgressPercent === 80, "Hospital progress updated to 80%");
  }

  // 5. Test ETA calculation
  console.log("\n📝 Test 4: ETA calculation...\n");

  {
    const gap = computeQueueIntelligence("50", "30");
    const etaMinutes = gap.estimatedWaitMinutes;
    assert(etaMinutes === 30, `ETA for 20 ahead: ${etaMinutes} min (expected 30)`);
  }

  // 6. Cleanup
  console.log("\n🧹 Cleaning up test data...\n");
  for (const id of dbTaskIds) {
    await db.update(tasksTable).set({ status: "cancelled" }).where(eq(tasksTable.id, id));
  }

  // 7. Summary
  console.log("\n═══════════════════════════════════════════════");
  console.log("  QUEUE ENGINE TEST RESULTS");
  console.log("═══════════════════════════════════════════════\n");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${passed + failed}`);
  console.log(`  🏁 Status: ${failed === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`\n  Categories tested: ${queueCategories.join(", ")}`);
  console.log(`  Edge cases tested: null tokens, empty strings`);
  console.log("\n═══════════════════════════════════════════════\n");

  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error("Queue engine test failed with error:", err);
  process.exit(1);
});
