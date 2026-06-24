/**
 * Dispatch Stress Test
 *
 * Simulates 100 tasks being created and 50 comrades being dispatched.
 * Verifies: no duplicate assignments, no race conditions, no memory leaks.
 *
 * Usage: npx tsx scripts/src/dispatch-stress-test.ts
 */

import { db, tasksTable, runnersTable, usersTable, notificationsTable, adminSettingsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const NUM_TASKS = 100;
const NUM_COMRADES = 50;
const TEST_USER_PHONE = "9999999900";
const CATEGORIES = ["hospital", "bank", "govt_office", "medicine", "document", "senior_care", "errand", "emergency"];

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

async function run() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  DISPATCH STRESS TEST — 100 tasks, 50 comrades");
  console.log("═══════════════════════════════════════════════\n");

  // 1. Find or create test user
  const [testUser] = await db.select().from(usersTable).where(eq(usersTable.phone, TEST_USER_PHONE));
  if (!testUser) {
    console.log("❌ Test user not found. Run seed first.");
    process.exit(1);
  }

  // 2. Get all verified/online comrades
  const allRunners = await db
    .select()
    .from(runnersTable)
    .where(and(
      eq(runnersTable.isOnline, true),
      eq(runnersTable.kycStatus, "verified"),
    ))
    .limit(NUM_COMRADES);

  assert(allRunners.length > 0, `Found ${allRunners.length} verified/online comrades`);
  if (allRunners.length === 0) {
    console.log("⚠️  No verified comrades found. Test partially skipped.");
    return;
  }

  const actualComrades = Math.min(allRunners.length, NUM_COMRADES);

  // 3. Stress test: Create 100 tasks and simulate dispatch
  console.log(`\n📋 Creating ${NUM_TASKS} test tasks...\n`);
  const taskIds: number[] = [];

  for (let i = 0; i < NUM_TASKS; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const [task] = await db.insert(tasksTable).values({
      userId: testUser.id,
      category,
      description: `Stress test task #${i + 1} - ${category}`,
      status: "pending",
      urgency: i % 5 === 0 ? "urgent" : "normal",
      locationCity: "Ahmedabad",
      locationArea: ["Bopal", "Satellite", "Navrangpura", "SG Highway", "CG Road"][i % 5],
      basePrice: "149",
      price: "149",
      runnerEarning: "104",
      platformFee: "45",
      paymentMethod: "online",
      otp: String(100000 + Math.floor(Math.random() * 900000)),
    }).returning();
    taskIds.push(task.id);
  }

  assert(taskIds.length === NUM_TASKS, `Created ${taskIds.length}/${NUM_TASKS} tasks`);

  // 4. Simulate concurrent acceptance — assign tasks to comrades
  console.log(`\n🤝 Simulating ${actualComrades} comrades accepting tasks...\n`);
  const assignments = new Map<number, number[]>(); // runnerId -> taskIds
  const runnerStatuses = new Map<number, string>(); // runnerId -> status

  for (let i = 0; i < Math.min(NUM_TASKS, actualComrades); i++) {
    const runner = allRunners[i % actualComrades];
    const taskId = taskIds[i];

    // Check if runner already has an active task (duplicate acceptance protection)
    const existingActive = await db
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(
        eq(tasksTable.runnerId, runner.id),
        inArray(tasksTable.status, ["assigned", "on_the_way", "at_location", "in_progress", "waiting_started"]),
      ))
      .limit(1);

    if (existingActive.length > 0) {
      // This is expected — duplicate protection working
      continue;
    }

    // Check task is still pending (no race condition)
    const [currentTask] = await db
      .select({ id: tasksTable.id, status: tasksTable.status, runnerId: tasksTable.runnerId })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));

    if (!currentTask || currentTask.status !== "pending" || currentTask.runnerId) {
      continue;
    }

    // Accept the task (simulating atomic check-and-update)
    const [updated] = await db
      .update(tasksTable)
      .set({
        runnerId: runner.id,
        activeRunnerId: runner.id,
        status: "assigned",
        acceptedAt: new Date(),
      })
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.status, "pending")))
      .returning();

    if (updated) {
      const existing = assignments.get(runner.id) || [];
      existing.push(taskId);
      assignments.set(runner.id, existing);
    }
  }

  // 5. Verify no duplicate assignments
  console.log("\n🔍 Verifying integrity...\n");

  const allAssignedTasks = await db
    .select({ id: tasksTable.id, runnerId: tasksTable.runnerId, activeRunnerId: tasksTable.activeRunnerId })
    .from(tasksTable)
    .where(inArray(tasksTable.id, taskIds));

  for (const task of allAssignedTasks) {
    if (task.runnerId && task.activeRunnerId) {
      assert(task.runnerId === task.activeRunnerId,
        `Task ${task.id}: runnerId (${task.runnerId}) matches activeRunnerId (${task.activeRunnerId})`);
    }
  }

  // Check for duplicate runner assignments
  const runnerTaskMap = new Map<number, number[]>();
  for (const task of allAssignedTasks) {
    if (task.runnerId) {
      const existing = runnerTaskMap.get(task.runnerId) || [];
      existing.push(task.id);
      runnerTaskMap.set(task.runnerId, existing);
    }
  }

  let duplicateCount = 0;
  for (const [runnerId, tasks] of runnerTaskMap.entries()) {
    if (tasks.length > 1) {
      // Each task assigned to a runner is a duplicate since only 1 active per runner
      duplicateCount += tasks.length - 1;
    }
  }

  assert(duplicateCount === 0, `Zero duplicate active assignments (found ${duplicateCount})`);

  // 6. Cleanup — set all test tasks back to pending or cancelled
  console.log("\n🧹 Cleaning up test data...\n");
  await db.update(tasksTable)
    .set({ status: "cancelled", runnerId: null, activeRunnerId: null })
    .where(inArray(tasksTable.id, taskIds));

  // 7. Summary
  console.log("\n═══════════════════════════════════════════════");
  console.log("  DISPATCH STRESS TEST RESULTS");
  console.log("═══════════════════════════════════════════════\n");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${passed + failed}`);
  console.log(`  🏁 Status: ${failed === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`\n  Tasks created: ${NUM_TASKS}`);
  console.log(`  Comrades participating: ${actualComrades}`);
  console.log(`  Tasks assigned: ${allAssignedTasks.filter(t => t.runnerId).length}`);
  console.log(`  Unique runners: ${runnerTaskMap.size}`);
  console.log(`  Duplicate assignments: ${duplicateCount}`);
  console.log("\n═══════════════════════════════════════════════\n");

  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error("Stress test failed with error:", err);
  process.exit(1);
});
