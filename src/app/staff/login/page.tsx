import LoginCard from "@/components/dashboard/LoginCard";
import { dashboardLogin } from "@/components/dashboard/auth-actions";

type StaffLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function StaffLoginPage({
  searchParams,
}: StaffLoginPageProps) {
  const params = await searchParams;

  return (
    <LoginCard
      title="Personeel inloggen"
      subtitle="Log in met het personeelsaccount van uw restaurant."
      note="Alleen voor personeel en servicemedewerkers."
      action={dashboardLogin}
      error={params.error}
    />
  );
}
