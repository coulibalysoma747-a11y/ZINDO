import { Wrench } from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { AuthCard } from "@/components/auth/AuthCard";
import { getPlatformConfig } from "@/lib/platform-config";

export default async function MaintenancePage() {
  const config = await getPlatformConfig();

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-3 text-center">
        <ZindoLogo size={48} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Wrench className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-zindo-ink-900">ZINDO est en maintenance</h2>
        <p className="text-sm text-zinc-500">
          {config.maintenanceMessage ??
            "Une intervention technique est en cours. L'accès sera rétabli très prochainement — merci de votre patience."}
        </p>
      </div>
    </AuthCard>
  );
}
