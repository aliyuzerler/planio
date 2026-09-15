export interface AppNavItem {
  href: string;
  label: string;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Gösterge" },
  { href: "/businesses", label: "İşletmeler" },
  { href: "/subscriptions", label: "Abonelikler" },
  { href: "/plans", label: "Planlar" },
  { href: "/audit-logs", label: "Denetim kayıtları" },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
