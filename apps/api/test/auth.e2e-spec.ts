import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { parseApiEnv } from "@xenior/config";
import { AuthModule } from "../src/auth/auth.module";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

describe("Authentication (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `phase3-${randomUUID()}@example.test`;
  const password = "StrongPassword!123";
  let accessToken = "";
  let refreshToken = "";
  let rotatedRefreshToken = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (config) => parseApiEnv(config),
        }),
        PrismaModule,
        AuthModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { businessUsers: true },
    });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.businessUser.deleteMany({ where: { userId: user.id } });
      await prisma.business.deleteMany({
        where: {
          id: { in: user.businessUsers.map((item) => item.businessId) },
        },
      });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  it("rejects an unauthorized current-user request", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
  });

  it("registers User, Business and owner membership atomically", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: email.toUpperCase(),
        password,
        firstName: "Phase",
        lastName: "Three",
        businessName: "Phase 3 Test Business",
      })
      .expect(201);

    expect(response.body.user.email).toBe(email);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    accessToken = response.body.accessToken as string;
    refreshToken = response.body.refreshToken as string;

    const storedUser = await prisma.user.findUnique({
      where: { email },
      include: { businessUsers: { include: { business: true } } },
    });
    expect(storedUser?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(storedUser?.passwordHash).not.toBe(password);
    expect(storedUser?.businessUsers).toHaveLength(1);
    expect(storedUser?.businessUsers[0]?.role).toBe("BUSINESS_OWNER");
    expect(storedUser?.businessUsers[0]?.business.name).toBe(
      "Phase 3 Test Business",
    );
  });

  it("returns the current user for a valid access token", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.user.email).toBe(email);
    expect(response.body.memberships).toHaveLength(1);
  });

  it("rejects invalid credentials without revealing the account", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "WrongPassword!123" })
      .expect(401);

    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs in with valid credentials", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    expect(response.body.user.email).toBe(email);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it("rotates refresh tokens and rejects the replaced token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    rotatedRefreshToken = response.body.refreshToken as string;
    expect(rotatedRefreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });

  it("revokes the current session on logout", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .send({ refreshToken: rotatedRefreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401);
  });
});
