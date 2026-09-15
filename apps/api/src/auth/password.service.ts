import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

const ARGON2_OPTIONS: argon2.Options & { type: number } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  private readonly dummyHash = argon2.hash(
    "not-a-real-user-password",
    ARGON2_OPTIONS,
  );

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyOrDummy(
    passwordHash: string | null | undefined,
    password: string,
  ): Promise<boolean> {
    return this.verify(passwordHash ?? (await this.dummyHash), password);
  }
}
