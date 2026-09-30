import { redirect } from "next/navigation";

// Menu management moved to the management environment. The target route
// enforces menu.manage, so staff end up back on /staff.
export default function OldStaffMenuPage() {
  redirect("/management/menu");
}
