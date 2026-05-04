import { requireAuth } from "@/lib/auth-helpers";
import { PasswordPageClient } from "./password-page-client";

export default async function PasswordPage() {
  const session = await requireAuth();

  return (
    <PasswordPageClient
      userName={session.user.name}
      passwordExpired={session.user.passwordExpired}
    />
  );
}
