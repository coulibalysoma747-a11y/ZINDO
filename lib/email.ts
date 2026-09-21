import "server-only";
import { Resend } from "resend";

// EMAIL_FROM par défaut : domaine de test Resend, fonctionne sans configuration
// mais peut atterrir en spam / être limité. Une fois un domaine vérifié sur
// resend.com, définir EMAIL_FROM="ZINDO <no-reply@votre-domaine.com>".
const DEFAULT_FROM = "ZINDO <onboarding@resend.dev>";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquant");
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getClient();
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Réinitialisez votre mot de passe ZINDO",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
        <h2 style="color:#176d30;margin-bottom:4px">ZINDO</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#176d30;color:#fff;text-decoration:none;
                    padding:12px 24px;border-radius:12px;font-weight:bold;margin:16px 0">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="font-size:13px;color:#71717a">
          Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande,
          ignorez simplement cet e-mail — votre mot de passe reste inchangé.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Envoi de l'e-mail échoué : ${error.message}`);
}

export async function sendVerificationCodeEmail(to: string, code: string, firstName: string) {
  const resend = getClient();
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${code} — Confirmez votre compte ZINDO`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
        <h2 style="color:#176d30;margin-bottom:4px">ZINDO</h2>
        <p>Bonjour ${firstName},</p>
        <p>Voici votre code de confirmation pour finaliser la création de votre compte :</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                  background:#f4f4f5;border-radius:12px;padding:16px;margin:16px 0;color:#176d30">
          ${code}
        </p>
        <p style="font-size:13px;color:#71717a">
          Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande,
          ignorez simplement cet e-mail.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Envoi de l'e-mail échoué : ${error.message}`);
}
