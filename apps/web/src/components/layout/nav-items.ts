import type { BusinessUserRole } from "@xenior/types";

export interface AppNavItem {
  href: string;
  label: string;
}

export type SidebarSection =
  | {
      kind: "link";
      id: string;
      href: string;
      label: string;
    }
  | {
      kind: "folder";
      id: string;
      label: string;
      children: AppNavItem[];
    };

export const BUSINESS_ROLE_LABELS: Record<BusinessUserRole, string> = {
  BUSINESS_OWNER: "İşletme sahibi",
  BUSINESS_ADMIN: "İşletme yöneticisi",
  STAFF: "Personel",
  ACCOUNTANT: "Muhasebe",
};

/** All 21 workspace links — none may be dropped when regrouping. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Gösterge" },
  { href: "/settings/appointments", label: "Randevular" },
  { href: "/settings/customers", label: "Müşteriler" },
  { href: "/settings/services", label: "Hizmetler" },
  { href: "/settings/staff", label: "Personel" },
  { href: "/settings/resources", label: "Kaynaklar" },
  { href: "/settings/specializations", label: "Uzmanlıklar" },
  { href: "/settings/campaigns", label: "Kampanyalar" },
  { href: "/settings/sales", label: "Satışlar" },
  { href: "/settings/pos", label: "POS" },
  { href: "/settings/cash", label: "Kasa" },
  { href: "/settings/ledger", label: "Cari" },
  { href: "/settings/expenses", label: "Giderler" },
  { href: "/settings/commissions", label: "Prim kuralları" },
  { href: "/settings/earnings", label: "Hakediş" },
  { href: "/settings/reports", label: "Raporlar" },
  { href: "/settings/business", label: "İşletme" },
  { href: "/settings/notifications", label: "Bildirimler" },
  { href: "/settings/integrations", label: "Entegrasyonlar" },
  { href: "/settings/subscription", label: "Abonelik" },
  { href: "/settings/audit", label: "Denetim" },
];

const ACCOUNTANT_HREFS = new Set([
  "/dashboard",
  "/settings/sales",
  "/settings/pos",
  "/settings/cash",
  "/settings/ledger",
  "/settings/expenses",
  "/settings/customers",
  "/settings/earnings",
  "/settings/reports",
]);

export function navItemsForRole(
  role: BusinessUserRole | undefined,
): AppNavItem[] {
  if (role === "ACCOUNTANT") {
    return APP_NAV_ITEMS.filter((item) => ACCOUNTANT_HREFS.has(item.href));
  }
  if (role === "STAFF") {
    return APP_NAV_ITEMS.filter(
      (item) =>
        item.href !== "/settings/resources" &&
        item.href !== "/settings/campaigns" &&
        item.href !== "/settings/commissions" &&
        item.href !== "/settings/cash" &&
        item.href !== "/settings/ledger" &&
        item.href !== "/settings/expenses" &&
        item.href !== "/settings/pos" &&
        item.href !== "/settings/integrations" &&
        item.href !== "/settings/reports" &&
        item.href !== "/settings/audit",
    );
  }
  if (role === "BUSINESS_ADMIN") {
    return APP_NAV_ITEMS.filter(
      (item) =>
        item.href !== "/settings/pos" &&
        item.href !== "/settings/integrations" &&
        item.href !== "/settings/reports" &&
        item.href !== "/settings/audit",
    );
  }
  return APP_NAV_ITEMS;
}

function pickItems(
  available: Map<string, AppNavItem>,
  hrefs: string[],
): AppNavItem[] {
  return hrefs
    .map((href) => available.get(href))
    .filter((item): item is AppNavItem => Boolean(item));
}

/** Compact sidebar: top links + expandable folders (all 21 routes preserved). */
export function sidebarSectionsForRole(
  role: BusinessUserRole | undefined,
): SidebarSection[] {
  const available = new Map(
    navItemsForRole(role).map((item) => [item.href, item]),
  );
  const sections: SidebarSection[] = [];

  const pushLink = (id: string, href: string) => {
    const item = available.get(href);
    if (!item) return;
    sections.push({ kind: "link", id, href: item.href, label: item.label });
  };

  const pushFolder = (id: string, label: string, hrefs: string[]) => {
    const children = pickItems(available, hrefs);
    if (children.length === 0) return;
    if (children.length === 1) {
      sections.push({
        kind: "link",
        id,
        href: children[0].href,
        label: children[0].label,
      });
      return;
    }
    sections.push({ kind: "folder", id, label, children });
  };

  pushLink("dashboard", "/dashboard");
  pushLink("appointments", "/settings/appointments");
  pushLink("customers", "/settings/customers");
  pushFolder("catalog", "Katalog", [
    "/settings/services",
    "/settings/staff",
    "/settings/resources",
    "/settings/specializations",
  ]);
  pushLink("campaigns", "/settings/campaigns");
  pushFolder("finance", "Finans", [
    "/settings/sales",
    "/settings/pos",
    "/settings/cash",
    "/settings/ledger",
    "/settings/expenses",
  ]);
  pushFolder("commissions", "Prim & hakediş", [
    "/settings/commissions",
    "/settings/earnings",
  ]);
  pushLink("reports", "/settings/reports");
  pushFolder("settings", "Ayarlar", [
    "/settings/business",
    "/settings/notifications",
    "/settings/integrations",
    "/settings/subscription",
    "/settings/audit",
  ]);

  return sections;
}

/** @deprecated Prefer sidebarSectionsForRole — kept for compatibility. */
export function navGroupsForRole(role: BusinessUserRole | undefined) {
  return sidebarSectionsForRole(role)
    .filter((section) => section.kind === "folder")
    .map((section) => ({
      id: section.id,
      label: section.label,
      items: section.children,
    }));
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isSidebarFolderActive(
  pathname: string,
  children: AppNavItem[],
): boolean {
  return children.some((item) => isNavItemActive(pathname, item.href));
}

export function isAccountantAllowedPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/settings/earnings") return true;
  if (pathname === "/settings/reports") return true;
  if (
    pathname === "/settings/sales" ||
    pathname === "/settings/pos" ||
    pathname === "/settings/cash" ||
    pathname === "/settings/ledger" ||
    pathname === "/settings/expenses"
  ) {
    return true;
  }
  if (
    pathname.startsWith("/settings/sales/") ||
    pathname.startsWith("/settings/cash/") ||
    pathname.startsWith("/settings/expenses/")
  ) {
    return true;
  }
  if (pathname === "/settings/customers") return true;
  if (!pathname.startsWith("/settings/customers/")) return false;
  if (pathname === "/settings/customers/new") return false;
  return !pathname.endsWith("/edit");
}
