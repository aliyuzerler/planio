const WRITE_PREFIXES = [
  "/settings/appointments/new",
  "/settings/customers/new",
  "/settings/staff/new",
  "/settings/services/new",
  "/settings/campaigns/new",
  "/settings/commissions/new",
  "/settings/sales/new",
  "/settings/cash/new",
  "/settings/expenses/new",
  "/settings/resources",
  "/settings/specializations",
  "/settings/business",
  "/settings/notifications",
  "/settings/integrations",
  "/settings/pos",
];

export function isSubscriptionWritePath(pathname: string): boolean {
  if (pathname.includes("/edit")) return true;
  if (
    WRITE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return (
    /^\/settings\/appointments\/[^/]+$/.test(pathname) ||
    /^\/settings\/sales\/[^/]+$/.test(pathname)
  );
}
