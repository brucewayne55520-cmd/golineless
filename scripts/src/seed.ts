import { db } from "@workspace/db";
import { subscriptionPlansTable } from "@workspace/db";

async function seed() {
  // Subscription plans
  await db.delete(subscriptionPlansTable);
  await db.insert(subscriptionPlansTable).values([
    {
      id: "silver",
      name: "Silver Plan",
      priceMonthly: "499",
      priceYearly: "4990",
      tasksPerMonth: 4,
      badge: "Starter",
      isPopular: false,
      features: ["4 tasks per month", "Hospital & bank queues", "Priority support", "GPS tracked runners", "WhatsApp updates"],
    },
    {
      id: "gold",
      name: "Gold Plan",
      priceMonthly: "899",
      priceYearly: "8990",
      tasksPerMonth: 8,
      badge: "Most Popular",
      isPopular: true,
      features: ["8 tasks per month", "All categories", "Emergency runner available", "Dedicated runner preference", "Photo proof on completion", "WhatsApp & phone support"],
    },
    {
      id: "platinum",
      name: "Platinum Plan",
      priceMonthly: "1499",
      priceYearly: "14990",
      tasksPerMonth: null,
      badge: "Best for NRIs",
      isPopular: false,
      features: ["Unlimited tasks", "Dedicated runner assigned", "24/7 emergency support", "Senior companion visits", "Medicine delivery included", "Monthly wellness call", "Caregiver notes & reports"],
    },
  ]);
  console.log("✅ Seeded 3 subscription plans");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
