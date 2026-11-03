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
      note="Gebruik je managementaccount. Ben je nog als personeel ingelogd? Log hier in met je managementgegevens om te wisselen."
      action={managementLogin}
      error={params.error}
    />
  );
}
