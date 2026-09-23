import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { verifyMerchantCredentials } from "@/lib/auth-credentials";

// Connexion pour l'application Windows (Electron) : celle-ci n'embarque plus
// SUPABASE_SERVICE_ROLE_KEY (voir la mémoire "Electron desktop build" et
// scripts/generate-electron-env.mjs), donc son serveur local ne peut pas
// vérifier lui-même un mot de passe. Cette route tourne uniquement sur le
// déploiement web (seul endroit où SUPABASE_JWT_SECRET/SUPABASE_SERVICE_ROLE_KEY
// existent) : elle vérifie les identifiants puis renvoie un jeton Supabase
// "authenticated" limité au commerce du commerçant, que le serveur local
// utilise ensuite pour toutes ses requêtes (lib/supabase.ts
// setDesktopSupabaseClient) — l'isolation entre commerces est appliquée par
// les policies RLS (supabase/migrations/2026-09-23_rls_desktop_scoped_access.sql),
// pas par cette route.
//
// La double authentification (2FA/TOTP) n'est pas encore prise en charge ici
// (choix explicite pour cette première étape) : un compte avec le 2FA activé
// reçoit un 403 et doit se connecter depuis le site web pour l'instant.

const SCOPED_TOKEN_TTL = "4h";

const bodySchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error("[api/desktop/login] SUPABASE_JWT_SECRET manquant");
    return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const result = await verifyMerchantCredentials(parsed.data.identifier.trim(), parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }
  if (result.totpEnabled) {
    return NextResponse.json(
      { error: "La double authentification n'est pas encore prise en charge sur l'application Windows." },
      { status: 403 }
    );
  }

  const supabaseAccessToken = await new SignJWT({
    role: "authenticated",
    zindo_business_id: result.businessId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(result.userId)
    .setIssuedAt()
    .setExpirationTime(SCOPED_TOKEN_TTL)
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({
    userId: result.userId,
    businessId: result.businessId,
    role: result.role,
    supabaseAccessToken,
  });
}
