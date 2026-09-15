import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { ApiEnv } from "@xenior/config";
import { TENANT_HEADER } from "@xenior/types";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { initSentry } from "./observability/sentry";

const BODY_LIMIT = "256kb";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<ApiEnv, true>);
  const environment = config.get("NODE_ENV", { infer: true });
  const webUrl = config.get("WEB_URL", { infer: true });
  const adminUrl = config.get("ADMIN_URL", { infer: true });
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  expressApp.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: environment === "production",
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

  app.setGlobalPrefix("api/v1");
  const corsOrigins = [webUrl, adminUrl].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (environment !== "production") {
    for (const port of [3000, 3002, 3004]) {
      const origin = `http://localhost:${port}`;
      if (!corsOrigins.includes(origin)) corsOrigins.push(origin);
    }
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ["Accept", "Authorization", "Content-Type", TENANT_HEADER],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  initSentry({
    dsn: config.get("SENTRY_DSN", { infer: true }),
    environment,
  });

  if (environment !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Xenior API")
      .setDescription("Multi-tenant REST API for beauty center operations.")
      .setVersion("1.0")
      .addBearerAuth()
      .addApiKey(
        { type: "apiKey", in: "header", name: TENANT_HEADER },
        "business",
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(config.get("API_PORT", { infer: true }));
}

void bootstrap();
