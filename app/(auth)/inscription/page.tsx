import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { getPlatformConfig, getTrialDays } from "@/lib/platform-config";
import { RegisterForm } from "./register-form";
import { getReferralContext } from "@/lib/referral-signup";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; vendeur?: string }> }) {
  if ((await getPlatformConfig()).maintenanceMode) redirect("/maintenance");
  const { ref, vendeur } = await searchParams;
  const referral = await getReferralContext(ref);

  return (
    <Card>
      <CardBody className="space-y-5">
        <RegisterForm referralCode={referral.code} showReferralField={referral.showField} trialDays={await getTrialDays()} marketSeller={vendeur === "marche"} />
        <p className="text-center text-sm text-zinc-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-zindo-green-700 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
