import type { NotificationChannel } from "@xenior/types";
import { normalizeTrMsisdn } from "../phone";
import {
  InvalidNotificationError,
  NotificationProviderError,
} from "../notification-errors";
import type {
  NotificationProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "./notification-provider";

const NETGSM_ERRORS: Record<string, string> = {
  "20": "Mesaj metni veya başlık hatalı.",
  "30": "Geçersiz kullanıcı adı, parola veya API erişimi kapalı.",
  "40": "Mesaj başlığı (abonelik) tanımlı değil.",
  "50": "Abone hesabında yeterli kredi yok.",
  "51": "Kredi yetersiz.",
  "70": "Hatalı sorgu. Gönderilen parametrelerden birisi hatalı veya zorunlu alan eksik.",
  "80": "Gönderim sınır aşımı.",
  "85": "Mükerrer gönderim sınır aşımı.",
};

export interface NetGsmCredentials {
  usercode: string;
  password: string;
  msgheader: string;
  baseUrl?: string;
}

export class NetGsmSmsProvider implements NotificationProvider {
  readonly name = "netgsm";
  readonly channel: NotificationChannel = "SMS";

  constructor(private readonly credentials: NetGsmCredentials) {}

  async send(
    message: NotificationProviderMessage,
  ): Promise<NotificationProviderResult> {
    const msisdn = normalizeTrMsisdn(message.destination);
    if (!msisdn) {
      throw new InvalidNotificationError(
        "SMS destination must be a valid phone number.",
        "MISSING_DESTINATION",
      );
    }
    const endpoint = new URL(
      "/sms/send/get",
      this.credentials.baseUrl ?? "https://api.netgsm.com.tr",
    );
    endpoint.searchParams.set("usercode", this.credentials.usercode);
    endpoint.searchParams.set("password", this.credentials.password);
    endpoint.searchParams.set("gsmno", msisdn);
    endpoint.searchParams.set("message", message.body.slice(0, 900));
    endpoint.searchParams.set("msgheader", this.credentials.msgheader);
    endpoint.searchParams.set("dil", "TR");

    let text: string;
    try {
      const response = await fetch(endpoint, { method: "GET" });
      text = (await response.text()).trim();
      if (!response.ok) {
        throw new NotificationProviderError(
          `NetGSM HTTP ${response.status}: ${text.slice(0, 200)}`,
        );
      }
    } catch (error) {
      if (error instanceof NotificationProviderError) throw error;
      throw new NotificationProviderError(
        error instanceof Error ? error.message : "NetGSM request failed.",
      );
    }

    const code = text.split(/\s+/)[0] ?? text;
    if (code === "00" || code === "01" || code === "02") {
      return {
        provider: this.name,
        providerMessageId: text.replace(/\s+/g, "-"),
      };
    }
    if (code === "30" || code === "40" || code === "70") {
      throw new InvalidNotificationError(
        NETGSM_ERRORS[code] ?? text,
        `NETGSM_${code}`,
      );
    }
    throw new NotificationProviderError(
      NETGSM_ERRORS[code] ?? `NetGSM rejected the send (${text}).`,
    );
  }
}
