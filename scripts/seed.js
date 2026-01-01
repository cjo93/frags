const { PrismaClient } = require("@prisma/client");

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seeding is disabled in production.");
  }

  const prisma = new PrismaClient();
  const userId = "demo-user";

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: "demo@frags.local",
      name: "Demo User"
    }
  });

  const existing = await prisma.profile.findFirst({ where: { userId } });
  if (existing) {
    console.log("Profiles already exist for demo user, skipping seed.");
    await prisma.$disconnect();
    return;
  }

  const profileAlice = await prisma.profile.create({
    data: {
      userId,
      displayName: "Alice",
      notes: "Sample profile with birth data",
      birthData: {
        create: {
          date: new Date("1990-01-01"),
          tzIana: "America/New_York",
          fidelity: "HIGH"
        }
      }
    }
  });

  const profileBob = await prisma.profile.create({
    data: {
      userId,
      displayName: "Bob",
      notes: "Second profile for family edge"
    }
  });

  await prisma.familyEdge.create({
    data: {
      fromProfileId: profileAlice.id,
      toProfileId: profileBob.id,
      relationType: "PARTNER",
      label: "Partner"
    }
  });

  await prisma.$disconnect();
  console.log("Seeded profiles and family edge for demo user.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
