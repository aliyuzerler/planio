import { parseApiEnv } from "@xenior/config";

const validBase = {
  DATABASE_URL: "postgresql://xenior:secret@localhost:5432/xenior",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "a-real-production-secret-at-least-32-chars",
  JWT_REFRESH_SECRET: "another-production-secret-at-least-32",
  API_URL: "https://api.example.test",
  WEB_URL: "https://app.example.test",
  ADMIN_URL: "https://admin.example.test",
  IYZICO_API_KEY: "sandbox-key",
  IYZICO_SECRET_KEY: "sandbox-secret",
  IYZICO_MERCHANT_ID: "123456",
  STORAGE_DRIVER: "s3",
  STORAGE_BUCKET: "xenior-files",
  STORAGE_ACCESS_KEY: "storage-key",
  STORAGE_SECRET_KEY: "storage-secret",
};

describe("production env safety", () => {
  it("accepts a complete production configuration", () => {
    expect(() =>
      parseApiEnv({ ...validBase, NODE_ENV: "production" }),
    ).not.toThrow();
  });

  it("rejects placeholder JWT secrets in production", () => {
    expect(() =>
      parseApiEnv({
        ...validBase,
        NODE_ENV: "production",
        JWT_SECRET: "replace-with-a-long-random-secret-at-least-32-chars",
      }),
    ).toThrow(/placeholder/i);
  });

  it("rejects missing iyzico credentials in production", () => {
    expect(() =>
      parseApiEnv({
        ...validBase,
        NODE_ENV: "production",
        IYZICO_API_KEY: undefined,
        IYZICO_SECRET_KEY: undefined,
        IYZICO_MERCHANT_ID: undefined,
      }),
    ).toThrow(/iyzico/i);
  });

  it("allows the mock payment provider outside production", () => {
    expect(() =>
      parseApiEnv({
        ...validBase,
        NODE_ENV: "development",
        IYZICO_API_KEY: undefined,
        IYZICO_SECRET_KEY: undefined,
        IYZICO_MERCHANT_ID: undefined,
        JWT_SECRET: "replace-with-a-long-random-secret-at-least-32-chars",
        JWT_REFRESH_SECRET: "replace-with-another-long-random-secret-32-chars",
        STORAGE_DRIVER: undefined,
        STORAGE_BUCKET: undefined,
        STORAGE_ACCESS_KEY: undefined,
        STORAGE_SECRET_KEY: undefined,
      }),
    ).not.toThrow();
  });

  it("rejects local object storage in production", () => {
    expect(() =>
      parseApiEnv({
        ...validBase,
        NODE_ENV: "production",
        STORAGE_DRIVER: "local",
      }),
    ).toThrow(/S3-compatible/i);
  });
});
