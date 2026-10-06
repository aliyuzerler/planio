import { z } from "zod";

// Şemalarda açıkça verilmiş mesajlar bu eşlemeden önceliklidir; buradaki
// eşleme yalnızca zod'un İngilizce varsayılanlarının kullanıcıya çıkmasını
// engellemek için kullanılır.
const turkishErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Bu alan zorunludur." };
      }
      return { message: "Geçersiz değer." };
    case z.ZodIssueCode.invalid_string:
      switch (issue.validation) {
        case "email":
          return { message: "Geçerli bir e-posta adresi girin." };
        case "url":
          return { message: "Geçerli bir internet adresi girin." };
        case "regex":
          return { message: "Değeri uygun biçimde girin." };
        case "datetime":
          return { message: "Geçerli bir tarih ve saat girin." };
        default:
          return { message: "Geçersiz metin." };
      }
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return { message: `En az ${issue.minimum} karakter girin.` };
      }
      if (issue.type === "number") {
        return {
          message: issue.inclusive
            ? `${issue.minimum} veya daha büyük bir değer girin.`
            : `${issue.minimum} değerinden büyük bir değer girin.`,
        };
      }
      if (issue.type === "array") {
        return { message: `En az ${issue.minimum} öğe seçin.` };
      }
      return { message: "Değer çok küçük." };
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") {
        return { message: `En fazla ${issue.maximum} karakter girin.` };
      }
      if (issue.type === "number") {
        return {
          message: issue.inclusive
            ? `${issue.maximum} veya daha küçük bir değer girin.`
            : `${issue.maximum} değerinden küçük bir değer girin.`,
        };
      }
      if (issue.type === "array") {
        return { message: `En fazla ${issue.maximum} öğe seçin.` };
      }
      return { message: "Değer çok büyük." };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Listeden geçerli bir seçenek seçin." };
    case z.ZodIssueCode.invalid_date:
      return { message: "Geçerli bir tarih girin." };
    case z.ZodIssueCode.not_multiple_of:
      return { message: "Değer, adımın katı olacak şekilde girin." };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(turkishErrorMap);
