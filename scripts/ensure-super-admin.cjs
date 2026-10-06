const { randomBytes } = require("node:crypto");

// pnpm workspace: paketler kendi node_modules'lerine sahiptir; script repo
// kökünden çalıştığı için çözümleme sırası dener.
function resolvePrismaClient() {
  const candidates = [
    "@prisma/client",
    "../packages/database/node_modules/@prisma/client",
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // sıradaki yolu dene
    }
  }
  throw new Error(
    "@prisma/client bulunamadı. Repo kökünde `pnpm install` çalıştırın.",
  );
}

function resolveArgon2() {
  const candidates = ["argon2", "../apps/api/node_modules/argon2"];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // sıradaki yolu dene
    }
  }
  throw new Error("argon2 bulunamadı. Repo kökünde `pnpm install` çalıştırın.");
}

const { PrismaClient } = resolvePrismaClient();
const argon2 = resolveArgon2();

// Süper admin e-postası/bilgileri ortamdan alınır; şifre asla kodda tutulmaz.
// Şifre sağlama sırası: SUPER_ADMIN_PASSWORD ortam değişkeni, yoksa
// SUPER_ADMIN_GENERATE=1 ile rastgele üretim (konsola bir kez yazılır).
const email = process.env.SUPER_ADMIN_EMAIL || "admin@xenior.local";
const envPassword = process.env.SUPER_ADMIN_PASSWORD;
const generate = process.env.SUPER_ADMIN_GENERATE === "1";

if (!envPassword && !generate) {
  console.error(
    "Şifre gerekli: SUPER_ADMIN_PASSWORD=<şifre> belirtin veya " +
      "SUPER_ADMIN_GENERATE=1 ile rastgele şifre ürettirin. Örnek:\n" +
      "  SUPER_ADMIN_EMAIL=admin@ornek.com SUPER_ADMIN_PASSWORD='<güçlü şifre>' node scripts/ensure-super-admin.cjs",
  );
  process.exit(1);
}

const password = envPassword || randomBytes(24).toString("base64url");

const prisma = new PrismaClient();

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
      emailVerifiedAt: new Date(),
      firstName: "Platform",
      lastName: "Admin",
    },
    create: {
      email,
      passwordHash: hash,
      platformRole: "SUPER_ADMIN",
      emailVerifiedAt: new Date(),
      firstName: "Platform",
      lastName: "Admin",
    },
  });
  console.log(JSON.stringify({ id: user.id, email: user.email, role: user.platformRole }));
  if (!envPassword) {
    console.log(`Üretilen şifre (yalnızca bu kez gösterilir): ${password}`);
    console.log("Güvenli bir yerde saklayın ve oturum açtıktan sonra değiştirin.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
