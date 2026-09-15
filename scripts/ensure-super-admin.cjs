const { PrismaClient } = require("@prisma/client");
const argon2 = require("../apps/api/node_modules/argon2");

const prisma = new PrismaClient();
const email = "admin@xenior.local";
const password = "SuperAdmin!123";

async function main() {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      platformRole: "SUPER_ADMIN",
      isActive: true,
      firstName: "Platform",
      lastName: "Admin",
    },
    create: {
      email,
      passwordHash: hash,
      platformRole: "SUPER_ADMIN",
      firstName: "Platform",
      lastName: "Admin",
    },
  });
  console.log(JSON.stringify({ id: user.id, email: user.email, role: user.platformRole }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
