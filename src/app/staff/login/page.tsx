import { redirect } from "next/navigation";

import LoginCard from "@/components/dashboard/LoginCard";
import { staffLogin } from "@/components/dashboard/auth-actions";
import { getStaffRole } from "@/lib/staff-session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function StaffLoginPage({ searchParams }: LoginPageProps) {
  const role = await getStaffRole();

  if (role === "staff") {
    redirect("/staff");
  }

  if (role === "manager") {
    redirect("/management");
  }

  const params = await searchParams;

  return (
    <LoginCard
      title="Personeel"
      subtitle="Log in om tafelverzoeken, rekeningaanvragen en reserveringen te bekijken."
      passwordLabel="Personeelswachtwoord"
      action={staffLogin}
      error={params.error}
    />
  );
}
