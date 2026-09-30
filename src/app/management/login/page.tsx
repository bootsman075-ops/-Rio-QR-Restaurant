import { redirect } from "next/navigation";

import LoginCard from "@/components/dashboard/LoginCard";
import { managementLogin } from "@/components/dashboard/auth-actions";
import { getStaffRole } from "@/lib/staff-session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ManagementLoginPage({ searchParams }: LoginPageProps) {
  if ((await getStaffRole()) === "manager") {
    redirect("/management");
  }

  const params = await searchParams;

  return (
    <LoginCard
      title="Management"
      subtitle="Log in voor het volledige beheer: tafelverzoeken, reserveringen en de menukaart."
      passwordLabel="Managementwachtwoord"
      action={managementLogin}
      error={params.error}
    />
  );
}
