import { redirect } from "next/navigation";

import LoginCard from "@/components/dashboard/LoginCard";
import { dashboardLogin } from "@/components/dashboard/auth-actions";
import { getStaffContext } from "@/lib/staff-session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    omgeving?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const selectedArea = params.omgeving === "personeel" ? "staff" : "management";
  const context = await getStaffContext();

  if (context) {
    redirect(
      context.role === "platform_admin"
        ? "/platform"
        : context.role === "staff" || selectedArea === "staff"
          ? "/staff"
          : "/management",
    );
  }

  return (
    <LoginCard
      title="Inloggen"
      subtitle="Kies Management of Personeel en meld je aan met je eigen account."
      selectedArea={selectedArea}
      action={dashboardLogin}
      error={params.error}
    />
  );
}
