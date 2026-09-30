import MenuView from "@/components/dashboard/menu/MenuView";
import type { MenuSearchParams } from "@/components/dashboard/menu/MenuView";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ManagementMenuPage({
  searchParams,
}: {
  searchParams: Promise<MenuSearchParams>;
}) {
  await requirePermission("management.access");
  await requirePermission("menu.manage");

  return <MenuView params={await searchParams} />;
}
