import {
  renderEmailVerificationEmail,
  renderInviteEmail,
  renderPasswordResetEmail,
} from "./email-templates";

describe("Planio email templates", () => {
  const webUrl = "https://app.planio.test";

  it("renders verification email with logo and CTA", () => {
    const email = renderEmailVerificationEmail({
      webUrl,
      verifyUrl: `${webUrl}/verify-email?token=abc`,
      email: "owner@example.test",
    });

    expect(email.subject).toContain("doğrulama");
    expect(email.html).toContain("planio-logo.png");
    expect(email.html).toContain("E-postamı doğrula");
    expect(email.html).toContain("owner@example.test");
    expect(email.text).toContain(`${webUrl}/verify-email?token=abc`);
  });

  it("renders password reset email", () => {
    const email = renderPasswordResetEmail({
      webUrl,
      resetUrl: `${webUrl}/reset-password?token=xyz`,
      email: "owner@example.test",
    });

    expect(email.subject).toContain("parola");
    expect(email.html).toContain("Parolayı sıfırla");
    expect(email.html).toContain("#7eb8c8");
  });

  it("renders invite email with business and role", () => {
    const email = renderInviteEmail({
      webUrl,
      inviteUrl: `${webUrl}/invite?token=inv`,
      email: "staff@example.test",
      businessName: "Gülay Kuaför",
      roleLabel: "Personel",
    });

    expect(email.subject).toBe("Planio personel daveti");
    expect(email.html).toContain("Gülay Kuaför");
    expect(email.html).toContain("Daveti kabul et");
    expect(email.text).toContain("Personel");
  });
});
