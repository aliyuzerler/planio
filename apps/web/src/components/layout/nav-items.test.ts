import { describe, expect, it } from "vitest";
import {
  APP_NAV_ITEMS,
  isAccountantAllowedPath,
  isNavItemActive,
  isSidebarFolderActive,
  navItemsForRole,
  sidebarSectionsForRole,
} from "./nav-items";

describe("app navigation", () => {
  it("keeps all 21 workspace links when regrouped", () => {
    const hrefs = APP_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toHaveLength(21);
    expect(new Set(hrefs).size).toBe(21);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/settings/appointments",
        "/settings/customers",
        "/settings/staff",
        "/settings/resources",
        "/settings/services",
        "/settings/campaigns",
        "/settings/commissions",
        "/settings/earnings",
        "/settings/sales",
        "/settings/pos",
        "/settings/cash",
        "/settings/ledger",
        "/settings/expenses",
        "/settings/reports",
        "/settings/audit",
        "/settings/business",
        "/settings/notifications",
        "/settings/integrations",
        "/settings/subscription",
        "/settings/specializations",
      ]),
    );
  });

  it("exposes compact expandable sections for owners without dropping links", () => {
    const sections = sidebarSectionsForRole("BUSINESS_OWNER");
    expect(sections.map((section) => section.id)).toEqual([
      "dashboard",
      "appointments",
      "customers",
      "catalog",
      "staff",
      "campaigns",
      "finance",
      "commissions",
      "reports",
      "settings",
    ]);

    const folders = sections.filter((section) => section.kind === "folder");
    expect(folders.map((section) => section.label)).toEqual([
      "Katalog",
      "Finans",
      "Prim & hakediş",
      "Ayarlar",
    ]);

    const hrefs = sections.flatMap((section) =>
      section.kind === "link"
        ? [section.href]
        : section.children.map((item) => item.href),
    );
    expect(hrefs).toHaveLength(21);
    expect(hrefs).toContain("/settings/specializations");
    expect(hrefs).toContain("/settings/audit");
    expect(hrefs).toContain("/settings/pos");
    expect(hrefs).toContain("/settings/commissions");
  });

  it("marks nested settings routes as active without matching dashboard", () => {
    expect(isNavItemActive("/settings/customers/new", "/settings/customers")).toBe(
      true,
    );
    expect(isNavItemActive("/dashboard", "/settings/appointments")).toBe(false);
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(
      isSidebarFolderActive("/settings/cash/new", [
        { href: "/settings/sales", label: "Satışlar" },
        { href: "/settings/cash", label: "Kasa" },
      ]),
    ).toBe(true);
  });

  it("limits accountant navigation to cash pages and customer cards", () => {
    expect(navItemsForRole("ACCOUNTANT").map((item) => item.href)).toEqual([
      "/dashboard",
      "/settings/customers",
      "/settings/sales",
      "/settings/pos",
      "/settings/cash",
      "/settings/ledger",
      "/settings/expenses",
      "/settings/earnings",
      "/settings/reports",
    ]);
  });

  it("allows accountant customer list and detail but not writes", () => {
    expect(isAccountantAllowedPath("/settings/customers")).toBe(true);
    expect(
      isAccountantAllowedPath(
        "/settings/customers/52222222-2222-4222-8222-222222222222",
      ),
    ).toBe(true);
    expect(isAccountantAllowedPath("/settings/customers/new")).toBe(false);
    expect(
      isAccountantAllowedPath(
        "/settings/customers/52222222-2222-4222-8222-222222222222/edit",
      ),
    ).toBe(false);
    expect(isAccountantAllowedPath("/settings/earnings")).toBe(true);
    expect(isAccountantAllowedPath("/settings/sales")).toBe(true);
    expect(isAccountantAllowedPath("/settings/pos")).toBe(true);
    expect(isAccountantAllowedPath("/settings/reports")).toBe(true);
    expect(isAccountantAllowedPath("/settings/audit")).toBe(false);
    expect(isAccountantAllowedPath("/settings/cash/new")).toBe(true);
    expect(isAccountantAllowedPath("/settings/staff")).toBe(false);
    expect(isAccountantAllowedPath("/settings/subscription")).toBe(false);
  });

  it("hides resource, campaign and commission-rule management from staff", () => {
    const hrefs = navItemsForRole("STAFF").map((item) => item.href);
    expect(hrefs).not.toContain("/settings/resources");
    expect(hrefs).not.toContain("/settings/campaigns");
    expect(hrefs).not.toContain("/settings/commissions");
    expect(hrefs).not.toContain("/settings/cash");
    expect(hrefs).not.toContain("/settings/pos");
    expect(hrefs).not.toContain("/settings/integrations");
    expect(hrefs).not.toContain("/settings/reports");
    expect(hrefs).not.toContain("/settings/audit");
    expect(hrefs).toContain("/settings/earnings");
    expect(hrefs).toContain("/settings/sales");
    expect(hrefs).toContain("/settings/specializations");
  });
});
