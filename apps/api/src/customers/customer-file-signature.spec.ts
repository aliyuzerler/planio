import { detectCustomerFileSignature } from "./customer-file-signature";

describe("customer file signature detection", () => {
  it.each([
    ["application/pdf", Buffer.from("%PDF-1.7\n%", "ascii")],
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
    ["image/gif", Buffer.from("GIF89a\x01\x00\x01\x00", "ascii")],
    [
      "image/webp",
      Buffer.concat([
        Buffer.from("RIFF", "ascii"),
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from("WEBPVP8 ", "ascii"),
      ]),
    ],
  ])("detects %s from magic bytes", (expected, body) => {
    expect(detectCustomerFileSignature(body)).toBe(expected);
  });

  it("returns null for unknown or script-like content", () => {
    expect(detectCustomerFileSignature(Buffer.from("<html><script>", "ascii"))).toBeNull();
    expect(detectCustomerFileSignature(Buffer.from("<?php echo 1;", "ascii"))).toBeNull();
    expect(detectCustomerFileSignature(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
    expect(detectCustomerFileSignature(Buffer.alloc(0))).toBeNull();
  });
});
