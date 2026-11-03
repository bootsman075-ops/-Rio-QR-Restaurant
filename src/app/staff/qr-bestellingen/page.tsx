import OrdersView from "@/components/dashboard/orders/OrdersView";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StaffOrders({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("requests.handle");
  return <OrdersView area="staff" error={(await searchParams).error} />;
}
