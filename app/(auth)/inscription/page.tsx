import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { getPlatformConfig } from "@/lib/platform-config";
import { RegisterForm } from "./register-form";
import { getReferralContext } from "@/lib/referral-signup";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if ((await getPlatformConfig()).maintenanceMode) redirect("/maintenance");
  const referral = await getReferralContext((await searchParams).ref);

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Créer votre commerce</h2>
          <p className="text-sm text-zinc-500">Démarrez avec ZINDO en quelques secondes</p>
        </div>
        <RegisterForm referralCode={referral.code} showReferralField={referral.showField} />
        <p className="text-center text-sm text-zinc-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
