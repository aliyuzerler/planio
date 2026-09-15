import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes with Argon2id and verifies without storing plaintext", async () => {
    const password = "StrongPassword!123";
    const passwordHash = await service.hash(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain(password);
    await expect(service.verify(passwordHash, password)).resolves.toBe(true);
    await expect(service.verify(passwordHash, "wrong-password")).resolves.toBe(
      false,
    );
  });

  it("performs a dummy verification for unknown accounts", async () => {
    await expect(
      service.verifyOrDummy(undefined, "StrongPassword!123"),
    ).resolves.toBe(false);
  });
});
