const AUDIT_ACTION_LABELS: Record<string, string> = {
  APPOINTMENT_CREATED: "Randevu oluşturuldu",
  APPOINTMENT_UPDATED: "Randevu güncellendi",
  APPOINTMENT_RESCHEDULED: "Randevu yeniden planlandı",
  APPOINTMENT_CANCELLED: "Randevu iptal edildi",
  APPOINTMENT_COMPLETED: "Randevu tamamlandı",
  APPOINTMENT_NO_SHOW: "Randevu gelmedi olarak işaretlendi",
  BUSINESS_PROFILE_UPDATED: "İşletme profili güncellendi",
  BUSINESS_STATUS_UPDATED: "İşletme durumu güncellendi",
  CAMPAIGN_CREATED: "Kampanya oluşturuldu",
  CAMPAIGN_UPDATED: "Kampanya güncellendi",
  CAMPAIGN_SMS_BROADCAST: "Kampanya SMS’i gönderildi",
  CASH_ACCOUNT_CREATED: "Kasa hesabı oluşturuldu",
  CASH_ACCOUNT_UPDATED: "Kasa hesabı güncellendi",
  CASH_ACCOUNT_DEACTIVATED: "Kasa hesabı pasifleştirildi",
  COLLECTION_CREATED: "Tahsilat kaydedildi",
  COMMISSION_RULE_CREATED: "Prim kuralı oluşturuldu",
  COMMISSION_RULE_UPDATED: "Prim kuralı güncellendi",
  COMMISSION_RULE_DEACTIVATED: "Prim kuralı pasifleştirildi",
  CUSTOMER_CREATED: "Müşteri oluşturuldu",
  CUSTOMER_UPDATED: "Müşteri güncellendi",
  CUSTOMER_FILE_UPLOADED: "Müşteri dosyası yüklendi",
  CUSTOMER_FILE_DELETED: "Müşteri dosyası silindi",
  DATA_ERASE_COMPLETED: "Veri silme talebi tamamlandı",
  EXPENSE_CREATED: "Gider kaydedildi",
  OFFICIAL_DOCUMENT_ISSUED: "Resmi belge kesildi",
  OFFICIAL_DOCUMENT_FAILED: "Resmi belge kesilemedi",
  PAYMENT_CHECKOUT_CREATED: "Ödeme oturumu başlatıldı",
  PAYMENT_SUCCEEDED: "Ödeme alındı",
  RESOURCE_CREATED: "Kaynak oluşturuldu",
  RESOURCE_UPDATED: "Kaynak güncellendi",
  SALE_CREATED: "Satış oluşturuldu",
  SALES_RECEIPT_ISSUED: "Satış fişi kesildi",
  SERVICE_CREATED: "Hizmet oluşturuldu",
  SERVICE_UPDATED: "Hizmet güncellendi",
  SPECIALIZATION_CREATED: "Uzmanlık oluşturuldu",
  SPECIALIZATION_UPDATED: "Uzmanlık güncellendi",
  STAFF_CREATED: "Personel oluşturuldu",
  STAFF_UPDATED: "Personel güncellendi",
  STAFF_SPECIALIZATION_ASSIGNED: "Personele uzmanlık atandı",
  STAFF_SPECIALIZATION_UNASSIGNED: "Personelden uzmanlık kaldırıldı",
  SUBSCRIPTION_CHECKOUT_STARTED: "Abonelik ödemesi başlatıldı",
  SUBSCRIPTION_ACTIVATED: "Abonelik etkinleştirildi",
  SUBSCRIPTION_CANCELLED: "Abonelik iptal edildi",
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Appointment: "Randevu",
  Business: "İşletme",
  Campaign: "Kampanya",
  CashAccount: "Kasa hesabı",
  Collection: "Tahsilat",
  CommissionRule: "Prim kuralı",
  Customer: "Müşteri",
  CustomerFile: "Müşteri dosyası",
  DataRequest: "Veri talebi",
  Expense: "Gider",
  OfficialDocument: "Resmi belge",
  Payment: "Ödeme",
  Resource: "Kaynak",
  Sale: "Satış",
  SalesReceipt: "Satış fişi",
  Service: "Hizmet",
  Specialization: "Uzmanlık",
  Staff: "Personel",
  StaffSpecialization: "Personel uzmanlığı",
  Subscription: "Abonelik",
};

function humanizeCode(value: string): string {
  const text = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
  if (!text) return value;
  return text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? humanizeCode(action);
}

export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? humanizeCode(entityType);
}

export function formatAuditEntity(entityType: string, entityId: string): string {
  const label = auditEntityLabel(entityType);
  const shortId = entityId.slice(0, 8);
  return `${label} · ref ${shortId}`;
}
