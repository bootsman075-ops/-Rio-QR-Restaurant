import LoginCard from "@/components/dashboard/LoginCard";
import { managementLogin } from "@/components/dashboard/auth-actions";

type ManagementLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ManagementLoginPage({
  searchParams,
}: ManagementLoginPageProps) {
  const params = await searchParams;

  return (
    <LoginCard
      title="Management inloggen"
      subtitle="Log in met het managementaccount van uw restaurant."
      note="Alleen voor management en beheerders."
      action={managementLogin}
      error={params.error}
    />
  );
}
