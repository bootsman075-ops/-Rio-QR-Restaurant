import { redirect } from "next/navigation";

import LoginCard from "@/components/dashboard/LoginCard";
import { dashboardLogin } from "@/components/dashboard/auth-actions";
import { getStaffContext } from "@/lib/staff-session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const context = await getStaffContext();

  if (context) {
    redirect(
      context.role === "platform_admin"
        ? "/platform"
        : context.role === "staff"
          ? "/staff"
          : "/management",
    );
  }

  const params = await searchParams;

  return (
    <LoginCard
      title="Inloggen"
      subtitle="Log in op uw restaurantomgeving. Uw rechten en restaurant worden automatisch aan uw account gekoppeld."
      action={dashboardLogin}
      error={params.error}
    />
  );
}
