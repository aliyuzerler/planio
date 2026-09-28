export interface PlanioEmailContent {
  subject: string;
  preheader: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;
  metaLines?: string[];
}

export interface RenderedPlanioEmail {
  subject: string;
  text: string;
  html: string;
}

const COLORS = {
  page: "#eef6f8",
  card: "#ffffff",
  border: "#c5dde6",
  heading: "#2f5563",
  body: "#5a7380",
  label: "#3d6b7a",
  dark: "#1e3340",
  button: "#7eb8c8",
  buttonText: "#ffffff",
  mint: "#b8e6df",
  soft: "#F7FBFC",
  muted: "#8aa0ab",
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logoBlock(webUrl: string): string {
  const base = webUrl.replace(/\/$/, "");
  const logoUrl = `${base}/planio-logo.png`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0;">
          <img
            src="${escapeHtml(logoUrl)}"
            width="140"
            height="60"
            alt="Planio"
            style="display:block;width:140px;height:auto;border:0;outline:none;text-decoration:none;"
          />
        </td>
      </tr>
    </table>`;
}

function brandMark(): string {
  const dot = (size: number, color: string) =>
    `<td width="${size}" height="${size}" style="width:${size}px;height:${size}px;background-color:${color};border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
      <tr>
        ${dot(10, "#98b5d7")}
        <td width="6" style="width:6px;font-size:0;line-height:0;">&nbsp;</td>
        ${dot(10, "#7eb8c8")}
      </tr>
      <tr><td colspan="3" height="6" style="height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        ${dot(8, "#9fd0dc")}
        <td width="6" style="width:6px;font-size:0;line-height:0;">&nbsp;</td>
        ${dot(8, "#b8e6df")}
      </tr>
    </table>`;
}

function renderLayout(
  webUrl: string,
  content: PlanioEmailContent,
): RenderedPlanioEmail {
  const title = escapeHtml(content.title);
  const intro = escapeHtml(content.intro);
  const ctaLabel = escapeHtml(content.ctaLabel);
  const ctaUrl = escapeHtml(content.ctaUrl);
  const preheader = escapeHtml(content.preheader);
  const footnote = content.footnote
    ? escapeHtml(content.footnote)
    : "Bu bağlantı sınırlı süre geçerlidir. Siz istemediyseniz bu e-postayı yok sayabilirsiniz.";
  const metaHtml =
    content.metaLines
      ?.map(
        (line) =>
          `<p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:${COLORS.label};">${escapeHtml(line)}</p>`,
      )
      .join("") ?? "";

  const textLines = [
    "Planio",
    "",
    content.title,
    "",
    content.intro,
    ...(content.metaLines ?? []).map((line) => `- ${line}`),
    "",
    `${content.ctaLabel}: ${content.ctaUrl}`,
    "",
    content.footnote ??
      "Bu bağlantı sınırlı süre geçerlidir. Siz istemediyseniz bu e-postayı yok sayabilirsiniz.",
  ];

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.page};background-image:linear-gradient(180deg,#eef6f8 0%,#f7fbfc 48%,#e8f4f1 100%);">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
          <tr>
            <td style="padding:0 8px 20px 8px;">
              ${brandMark()}
              ${logoBlock(webUrl)}
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:18px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(61,107,122,0.08);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:6px;background:linear-gradient(90deg,#98b5d7 0%,#7eb8c8 55%,#b8e6df 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <h1 style="margin:0 0 12px 0;font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;font-size:24px;line-height:32px;font-weight:700;color:${COLORS.heading};">
                      ${title}
                    </h1>
                    <p style="margin:0 0 16px 0;font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;font-size:15px;line-height:24px;color:${COLORS.body};">
                      ${intro}
                    </p>
                    ${metaHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${COLORS.button}" style="border-radius:12px;background-color:${COLORS.button};">
                          <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;font-size:15px;font-weight:600;line-height:20px;color:${COLORS.buttonText};text-decoration:none;border-radius:12px;">
                            ${ctaLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:18px 0 0 0;font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;font-size:12px;line-height:18px;color:${COLORS.muted};word-break:break-all;">
                      Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br />
                      <a href="${ctaUrl}" style="color:${COLORS.label};text-decoration:underline;">${ctaUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px;">
              <p style="margin:0;font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;font-size:12px;line-height:18px;color:${COLORS.muted};">
                ${footnote}
              </p>
              <p style="margin:10px 0 0 0;font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;font-size:12px;line-height:18px;color:${COLORS.muted};">
                © Planio · İşletme paneli
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: content.subject,
    text: textLines.join("\n"),
    html,
  };
}

export function renderEmailVerificationEmail(input: {
  webUrl: string;
  verifyUrl: string;
  email: string;
}): RenderedPlanioEmail {
  return renderLayout(input.webUrl, {
    subject: "Planio e-posta doğrulama",
    preheader: "Hesabınızı etkinleştirmek için e-postanızı doğrulayın.",
    title: "E-postanızı doğrulayın",
    intro:
      "Planio hesabınızı oluşturdunuz. Panele güvenli biçimde erişmek için aşağıdaki düğmeyle e-posta adresinizi doğrulayın.",
    metaLines: [`Hesap: ${input.email}`],
    ctaLabel: "E-postamı doğrula",
    ctaUrl: input.verifyUrl,
    footnote:
      "Bu doğrulama bağlantısı yaklaşık 24 saat geçerlidir. Siz kayıt olmadıysanız bu e-postayı yok sayabilirsiniz.",
  });
}

export function renderPasswordResetEmail(input: {
  webUrl: string;
  resetUrl: string;
  email: string;
}): RenderedPlanioEmail {
  return renderLayout(input.webUrl, {
    subject: "Planio parola sıfırlama",
    preheader: "Parolanızı güvenli biçimde yenilemek için bağlantıyı kullanın.",
    title: "Parolanızı sıfırlayın",
    intro:
      "Hesabınız için bir parola sıfırlama isteği aldık. Devam etmek için aşağıdaki düğmeye tıklayın ve yeni parolanızı belirleyin.",
    metaLines: [`Hesap: ${input.email}`],
    ctaLabel: "Parolayı sıfırla",
    ctaUrl: input.resetUrl,
    footnote:
      "Bu bağlantı yaklaşık 24 saat geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayın; parolanız değişmez.",
  });
}

export function renderInviteEmail(input: {
  webUrl: string;
  inviteUrl: string;
  email: string;
  businessName: string;
  roleLabel: string;
}): RenderedPlanioEmail {
  const role = input.roleLabel.trim().toLowerCase();
  return renderLayout(input.webUrl, {
    subject: `Planio ${role} daveti`,
    preheader: `${input.businessName} sizi Planio paneline davet etti.`,
    title: "Planio paneline davetlisiniz",
    intro: `${input.businessName} sizi ${role} olarak Planio işletme paneline davet etti. Daveti kabul ederek hesabınızı oluşturabilir veya mevcut hesabınıza bağlanabilirsiniz.`,
    metaLines: [
      `İşletme: ${input.businessName}`,
      `Rol: ${input.roleLabel}`,
      `Davet edilen: ${input.email}`,
    ],
    ctaLabel: "Daveti kabul et",
    ctaUrl: input.inviteUrl,
    footnote:
      "Bu davet bağlantısı yaklaşık 7 gün geçerlidir. Beklemediğiniz bir davetse e-postayı yok sayabilirsiniz.",
  });
}
