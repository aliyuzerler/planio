import { apiErrorBodySchema } from "@xenior/validation";

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = "UNKNOWN_ERROR", statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const ERROR_MESSAGES_TR: Record<string, string> = {
  UNAUTHENTICATED: "Kimlik doğrulaması gerekli.",
  UNAUTHORIZED: "Bu işlem için giriş yapmalısınız.",
  FORBIDDEN: "Bu işlem için yetkiniz yok.",
  NOT_FOUND: "Kayıt bulunamadı.",
  RESOURCE_NOT_FOUND: "Kayıt bulunamadı.",
  CONFLICT: "Bu işlem çakışma nedeniyle tamamlanamadı.",
  VALIDATION_ERROR: "Gönderilen bilgiler geçersiz.",
  BAD_REQUEST: "İstek geçersiz.",
  INTERNAL_ERROR: "Beklenmeyen bir hata oluştu.",
  INVALID_EXPENSE: "Gider tutarı sıfırdan büyük olmalıdır.",
  INVALID_COMMISSION_ENTRY: "Hakediş satırı bu işletmeye ait değil.",
  COMMISSION_PAYOUT_EXCEEDS: "Hakediş ödemesi kazanılan tutarı aşamaz.",
  COMMISSION_ALREADY_PAID: "Bu hakediş satırı için ödeme zaten yapılmış.",
  INVALID_STAFF: "Personel bu işletmeye ait değil.",
  INVALID_CASH_ACCOUNT: "Kasa hesabı bu işletmeye ait değil.",
  CASH_ACCOUNT_NAME_CONFLICT: "Bu isimde bir kasa hesabı zaten var.",
  EMPTY_UPDATE: "Güncellenecek en az bir alan gerekli.",
  INVALID_COLLECTION: "Tahsilat tutarı sıfırdan büyük olmalıdır.",
  COLLECTION_EXCEEDS_REMAINING: "Tahsilat kalan bakiyeyi aşamaz.",
  INVALID_SALE_TARGET: "Satış hedefleri bu işletmeye ait değil.",
  STAFF_PROFILE_REQUIRED: "Bu işlem için personel profili gerekli.",
  INSUFFICIENT_BUSINESS_ROLE: "Bu işlem için işletme yetkiniz yetersiz.",
  INSUFFICIENT_PLATFORM_ROLE: "Bu işlem için platform yetkiniz yetersiz.",
  SUBSCRIPTION_INACTIVE: "İşletmenin aktif bir aboneliği yok.",
  FEATURE_NOT_AVAILABLE: "Mevcut plan bu özelliği kapsamıyor.",
  PLAN_LIMIT_REACHED: "Plan limitine ulaşıldı.",
  COMMISSION_RULE_NAME_CONFLICT: "Bu isimde bir prim kuralı zaten var.",
  INVALID_COMMISSION: "Prim değeri geçersiz.",
  INVALID_COMMISSION_SERVICE: "Hizmet bu işletmeye ait değil.",
  EMAIL_ALREADY_EXISTS: "Bu e-posta adresi zaten kayıtlı.",
  EMAIL_NOT_VERIFIED: "Devam etmeden önce e-posta adresinizi doğrulayın.",
  ACCOUNT_INACTIVE: "Hesap aktif değil.",
  INVALID_CREDENTIALS: "E-posta veya parola hatalı.",
  INVALID_AUTH_TOKEN: "Oturum geçersiz veya süresi dolmuş.",
  MEMBERSHIP_EXISTS: "Bu üyelik zaten mevcut.",
  INVALID_STAFF_INVITE: "Personel daveti geçersiz.",
  CURRENT_PASSWORD_REQUIRED:
    "Bu e-posta ile zaten bir hesabınız var. Mevcut parolanızı girin.",
  PASSWORD_REQUIRED: "Yeni hesap için bir parola belirlemelisiniz.",
  APPOINTMENT_OVERLAP: "Personelin bu saatlerde çakışan randevusu var.",
  RESOURCE_OVERLAP: "Kaynağın bu saatlerde çakışan randevusu var.",
  OUTSIDE_BUSINESS_HOURS: "Randevu işletme çalışma saatleri dışında.",
  OUTSIDE_STAFF_HOURS: "Randevu personel çalışma saatleri dışında.",
  CUSTOMER_INACTIVE: "Pasif müşterilere randevu verilemez.",
  STAFF_INACTIVE: "Pasif personele randevu verilemez.",
  SERVICE_INACTIVE: "Pasif hizmetler için randevu verilemez.",
  RESOURCE_INACTIVE: "Pasif kaynaklar için randevu verilemez.",
  SERVICE_NAME_EXISTS: "Bu isimde bir hizmet zaten var.",
  SPECIALIZATION_NAME_EXISTS: "Bu isimde bir uzmanlık zaten var.",
  CAMPAIGN_NAME_CONFLICT: "Bu isimde bir kampanya zaten var.",
  INVALID_DISCOUNT: "İndirim değeri geçersiz.",
  INVALID_CAMPAIGN_WINDOW: "Kampanya tarih aralığı geçersiz.",
  SMS_TEMPLATE_REQUIRED: "Toplu SMS için şablon gerekli.",
  RECEIPT_REQUIRED: "Resmi belge için önce satış fişi kesilmelidir.",
  OFFICIAL_DOCUMENT_EXISTS: "Bu satış için resmi belge zaten mevcut.",
  FILE_REQUIRED: "Boş olmayan bir dosya gerekli.",
  FILE_TOO_LARGE: "Dosya 10 MB sınırını aşıyor.",
  UNSUPPORTED_FILE_TYPE: "Yalnızca PDF ve görsel dosyalar kabul edilir.",
  TENANT_HEADER_REQUIRED: "İşletme bağlamı gerekli.",
  TENANT_CONTEXT_UNAVAILABLE: "İşletme bağlamı bu işlem için gerekli.",
  TENANT_ACCESS_DENIED: "Bu işletmeye erişim yetkiniz yok.",
  ALREADY_PAID: "Ödeme zaten alınmış.",
  CHECKOUT_NOT_FOUND: "Ödeme oturumu bulunamadı.",
  CHECKOUT_NOT_PAYABLE: "Bu ödeme tamamlanamaz.",
  APPOINTMENT_NOT_PAYABLE: "Bu randevu için ödeme alınamaz.",
  NO_ACTIVE_SUBSCRIPTION: "Aktif abonelik bulunamadı.",
  ALREADY_ON_PLAN: "Bu plan zaten aktif.",
  INVALID_DATE_RANGE: "Tarih aralığı geçersiz.",
  DATE_RANGE_TOO_LARGE: "Tarih aralığı çok geniş.",
  DATE_FILTER_CONFLICT: "date ile from/to birlikte kullanılamaz.",
  INVALID_DEPOSIT: "Kapora tutarı geçersiz.",
  STAFF_EMAIL_REQUIRED: "Davet göndermek için personel e-postası gerekli.",
  STAFF_SPECIALIZATION_ALREADY_ASSIGNED:
    "Bu uzmanlık personele zaten atanmış.",
  ACCOUNTANT_SPECIALIZATION_FORBIDDEN:
    "Muhasebecilere uzmanlık atanamaz.",
  SPECIALIZATION_INACTIVE: "Pasif uzmanlık atanamaz.",
  INVALID_STAFF_HOURS: "Çalışma saatleri her gün için tam olmalıdır.",
  INVALID_BUSINESS_HOURS: "İşletme çalışma saatleri geçersiz.",
  NETGSM_FIELDS_REQUIRED: "Netgsm alanları eksik.",
  WHATSAPP_FIELDS_REQUIRED: "WhatsApp alanları eksik.",
  SMTP_FIELDS_REQUIRED: "SMTP alanları eksik.",
  NOTIFICATION_TEST_FAILED: "Test bildirimi gönderilemedi.",
  PUSH_IS_PLATFORM_MANAGED: "Push bildirimleri platform tarafından yönetilir.",
  BROADCAST_UNAVAILABLE: "Toplu gönderim şu an kullanılamıyor.",
  PLAN_NOT_MAPPED: "Plan eşlemesi bulunamadı.",
  PAYMENT_AMOUNT_MISMATCH: "Ödeme tutarı uyuşmuyor.",
  PAYMENT_CURRENCY_MISMATCH: "Ödeme para birimi uyuşmuyor.",
  PAYMENT_PLAN_MISMATCH: "Ödeme planı uyuşmuyor.",
  WEBHOOK_SIGNATURE_INVALID: "Webhook imzası geçersiz.",
  WEBHOOK_INVALID: "Webhook isteği geçersiz.",
  UNKNOWN_ERROR: "Beklenmeyen bir hata oluştu.",
};

function localizeMessage(code: string, fallback: string): string {
  return ERROR_MESSAGES_TR[code] ?? fallback;
}

export function normalizeApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return new AppError(
      localizeMessage(error.code, error.message),
      error.code,
      error.statusCode,
    );
  }

  const parsed = apiErrorBodySchema.safeParse(error);
  if (parsed.success) {
    return new AppError(
      localizeMessage(parsed.data.code, parsed.data.message),
      parsed.data.code,
      parsed.data.statusCode,
    );
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError("Beklenmeyen bir hata oluştu.");
}
