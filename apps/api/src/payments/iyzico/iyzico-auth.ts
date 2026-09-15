import { createHmac, randomBytes } from "node:crypto";

export function createIyzicoRandomKey(): string {
  return `${Date.now()}${randomBytes(8).toString("hex")}`;
}

export function createIyzicoAuthorizationHeader(input: {
  apiKey: string;
  secretKey: string;
  uriPath: string;
  body: string;
  randomKey?: string;
}): { authorization: string; randomKey: string } {
  const randomKey = input.randomKey ?? createIyzicoRandomKey();
  const payload = `${randomKey}${input.uriPath}${input.body}`;
  const signature = createHmac("sha256", input.secretKey)
    .update(payload)
    .digest("hex");
  const authorizationString = `apiKey:${input.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    authorization: `IYZWSv2 ${Buffer.from(authorizationString, "utf8").toString("base64")}`,
    randomKey,
  };
}
