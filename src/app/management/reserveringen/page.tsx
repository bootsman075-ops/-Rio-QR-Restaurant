import ReservationsView from "@/components/dashboard/reservations/ReservationsView";
import type { ReservationsSearchParams } from "@/components/dashboard/reservations/ReservationsView";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ManagementReservationsPage({
  searchParams,
}: {
  searchParams: Promise<ReservationsSearchParams>;
}) {
  const role = await requirePermission("management.access");

  return <ReservationsView area="management" role={role} params={await searchParams} />;
}
