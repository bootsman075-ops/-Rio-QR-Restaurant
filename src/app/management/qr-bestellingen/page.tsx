import OrdersView from "@/components/dashboard/orders/OrdersView";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ManagementOrders({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("management.access");
  return <OrdersView area="management" error={(await searchParams).error} />;
}
