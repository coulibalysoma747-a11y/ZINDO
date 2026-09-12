import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";

export default async function AccountSuspendedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.business.suspended) redirect("/dashboard");

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-zindo-navy-900">Accès suspendu</h2>
        <p className="text-sm text-zinc-500">
          L&apos;accès de <span className="font-semibold text-zinc-700">{user.business.name}</span> à ZINDO a
          été temporairement suspendu par l&apos;administrateur de la plateforme. Contactez-le pour plus
          d&apos;informations.
        </p>
        <form action={logoutAction} className="w-full pt-2">
          <Button type="submit" variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
