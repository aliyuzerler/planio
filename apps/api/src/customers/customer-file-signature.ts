/**
 * Müşteri dosya yüklemelerinde içeriğin gerçek türünü magic byte'lardan
 * tespit eder. İstemciden gelen contentType başlığı kolayca sahtelenebilir;
 * saklamadan önce içerik ile bildirilen türün uyuşması doğrulanır.
 */
export function detectCustomerFileSignature(body: Buffer): string | null {
  if (body.length >= 5 && body.subarray(0, 5).equals(PDF_MAGIC)) {
    return "application/pdf";
  }
  if (body.length >= 8 && body.subarray(0, 8).equals(PNG_MAGIC)) {
    return "image/png";
  }
  if (body.length >= 3 && body.subarray(0, 3).equals(JPEG_MAGIC)) {
    return "image/jpeg";
  }
  if (
    body.length >= 6 &&
    (body.subarray(0, 6).equals(GIF87_MAGIC) ||
      body.subarray(0, 6).equals(GIF89_MAGIC))
  ) {
    return "image/gif";
  }
  if (body.length >= 12 && body.subarray(0, 4).equals(RIFF_MAGIC) && body.subarray(8, 12).equals(WEBP_MAGIC)) {
    return "image/webp";
  }
  return null;
}

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const GIF87_MAGIC = Buffer.from("GIF87a", "ascii");
const GIF89_MAGIC = Buffer.from("GIF89a", "ascii");
const RIFF_MAGIC = Buffer.from("RIFF", "ascii");
const WEBP_MAGIC = Buffer.from("WEBP", "ascii");
