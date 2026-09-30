import RequestsView from "@/components/dashboard/requests/RequestsView";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ManagementRequestsPage() {
  await requirePermission("management.access");

  return <RequestsView area="management" />;
}
