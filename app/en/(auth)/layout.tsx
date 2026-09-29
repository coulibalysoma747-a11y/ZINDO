import { cookies } from "next/headers";
import { AuthShell } from "@/components/auth/AuthShell";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";

// Nouveau style (flag accueil_pro), ou aperçu mémorisé depuis /?apercu=pro.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const pro = (await cookies()).get("zindo_apercu")?.value === "pro" || (await isFeatureEnabledGlobally("accueil_pro"));
  return (
    <AuthShell locale="en" pro={pro}>
      {children}
    </AuthShell>
  );
}
