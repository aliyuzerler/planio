import { z } from "zod";

const secretSchema = z.string().min(32, "Secret must be at least 32 characters");
const accessTokenTtlSchema = z.coerce
  .number()
  .int()
  .min(60)
  .max(60 * 60)
  .default(15 * 60);
const refreshTokenTtlSchema = z.coerce
  .number()
  .int()
  .min(60 * 60)
  .max(365 * 24 * 60 * 60)
  .default(30 * 24 * 60 * 60);

const PLACEHOLDER_SECRET = /replace-with|changeme|example-secret|please-change/i;

export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: secretSchema,
    JWT_REFRESH_SECRET: secretSchema,
    JWT_ACCESS_TTL_SECONDS: accessTokenTtlSchema,
    JWT_REFRESH_TTL_SECONDS: refreshTokenTtlSchema,
    API_URL: z.string().url(),
    WEB_URL: z.string().url(),
    ADMIN_URL: z.string().url().optional(),
    IYZICO_API_KEY: z.string().min(1).optional(),
    IYZICO_SECRET_KEY: z.string().min(1).optional(),
    IYZICO_MERCHANT_ID: z.string().min(1).optional(),
    IYZICO_BASE_URL: z
      .string()
      .url()
      .default("https://sandbox-api.iyzipay.com"),
    CREDENTIALS_ENCRYPTION_KEY: z.string().min(32).optional(),
    NETGSM_USERCODE: z.string().min(1).optional(),
    NETGSM_PASSWORD: z.string().min(1).optional(),
    NETGSM_MSGHEADER: z.string().min(1).optional(),
    NETGSM_BASE_URL: z.string().url().default("https://api.netgsm.com.tr"),
    WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_FROM: z.string().email().optional(),
    FCM_PROJECT_ID: z.string().min(1).optional(),
    FCM_CLIENT_EMAIL: z.string().email().optional(),
    FCM_PRIVATE_KEY: z.string().min(1).optional(),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().min(1).optional(),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_REGION: z.string().min(1).default("eu-central-1"),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_ACCESS_KEY: z.string().min(1).optional(),
    STORAGE_SECRET_KEY: z.string().min(1).optional(),
    STORAGE_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    SENTRY_DSN: z.string().url().optional(),
    ALLOW_MOCK_NOTIFICATIONS: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") {
      return;
    }
    if (PLACEHOLDER_SECRET.test(env.JWT_SECRET)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "Production JWT_SECRET must not use a placeholder value.",
      });
    }
    if (PLACEHOLDER_SECRET.test(env.JWT_REFRESH_SECRET)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "Production JWT_REFRESH_SECRET must not use a placeholder value.",
      });
    }
    if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must differ from JWT_SECRET.",
      });
    }
    if (!env.ADMIN_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_URL"],
        message: "ADMIN_URL is required in production.",
      });
    }
    if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY || !env.IYZICO_MERCHANT_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["IYZICO_API_KEY"],
        message: "iyzico credentials are required in production.",
      });
    }
    if (
      env.STORAGE_DRIVER === "s3" &&
      (!env.STORAGE_BUCKET || !env.STORAGE_ACCESS_KEY || !env.STORAGE_SECRET_KEY)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STORAGE_BUCKET"],
        message: "S3 bucket and credentials are required when STORAGE_DRIVER=s3.",
      });
    }
    if (env.STORAGE_DRIVER !== "s3") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STORAGE_DRIVER"],
        message: "Production object storage must use an S3-compatible driver.",
      });
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(env);
}

export function parseWebEnv(env: NodeJS.ProcessEnv): WebEnv {
  return webEnvSchema.parse(env);
}
