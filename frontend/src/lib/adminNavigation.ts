export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "ORDER_MANAGER" | "INVENTORY_MANAGER" | "SUPPORT";
export type AdminSection = {
  href: string; label: string; group: "WORKSPACE" | "COMMERCE" | "PEOPLE" | "SYSTEM";
  roles: readonly AdminRole[]; short: string;
};
const managers: AdminRole[] = ["ADMIN"];
const orders: AdminRole[] = ["ADMIN", "ORDER_MANAGER"];
const support: AdminRole[] = ["ADMIN", "SUPPORT"];
const inventory: AdminRole[] = ["ADMIN", "INVENTORY_MANAGER"];

// Navigation is an affordance, NOT an authorization boundary. Express role
// middleware and staff-session checks are authoritative for every API action.
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {href:"/admin", label:"Overview", group:"WORKSPACE", short:"OV", roles:["ADMIN","ORDER_MANAGER","INVENTORY_MANAGER","SUPPORT"]},
  {href:"/admin/content",label:"Content Update",group:"WORKSPACE",short:"TX",roles:managers},
  {href:"/admin/media",label:"Site Media",group:"WORKSPACE",short:"IM",roles:managers},
  {href:"/admin/catalog",label:"Categories & Segments",group:"COMMERCE",short:"CT",roles:managers},
  {href:"/admin/products",label:"Products",group:"COMMERCE",short:"PR",roles:managers},
  {href:"/admin/orders",label:"Orders",group:"COMMERCE",short:"OR",roles:orders},
  {href:"/admin/inventory",label:"Inventory",group:"COMMERCE",short:"ST",roles:inventory},
  {href:"/admin/shipments",label:"Shipments",group:"COMMERCE",short:"SH",roles:orders},
  {href:"/admin/payments",label:"Payments",group:"COMMERCE",short:"PY",roles:orders},
  {href:"/admin/refunds",label:"Refunds",group:"COMMERCE",short:"RF",roles:orders},
  {href:"/admin/customers",label:"Customers",group:"PEOPLE",short:"CU",roles:["ADMIN","ORDER_MANAGER","SUPPORT"]},
  {href:"/admin/reviews",label:"Reviews",group:"PEOPLE",short:"RV",roles:support},
  {href:"/admin/complaints",label:"Complaints",group:"PEOPLE",short:"CM",roles:support},
  {href:"/admin/staff",label:"Staff Accounts",group:"SYSTEM",short:"SF",roles:["SUPER_ADMIN"]},
  {href:"/admin/audit",label:"Audit Log",group:"SYSTEM",short:"AU",roles:managers},
  {href:"/admin/email",label:"Email Outbox",group:"SYSTEM",short:"EM",roles:managers},
  {href:"/admin/settings",label:"Session & Security",group:"SYSTEM",short:"SE",roles:["ADMIN","ORDER_MANAGER","INVENTORY_MANAGER","SUPPORT"]},
];
export function canAccessSection(role: string, href: string): boolean {
  const section = ADMIN_SECTIONS.find(item => item.href === href);
  if (!section) return false;
  return role === "SUPER_ADMIN" || section.roles.includes(role as AdminRole);
}
export function getAdminHome(role: string): string {
  return role === "SUPER_ADMIN" || role === "ADMIN" ? "/admin" : "/admin";
}
export function safeAdminNext(path: string | null): string | null {
  if (!path || !/^\/admin(?:\/[a-z-]+)*$/.test(path) || path === "/admin/login") return null;
  return ADMIN_SECTIONS.some(item=>item.href===path) ? path : null;
}
