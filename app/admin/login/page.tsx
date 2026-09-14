import { ShieldCheck } from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="theme-locked relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zindo-green-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-zindo-ink-500/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <ZindoLogo size={56} />
          <div className="mt-4 flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="h-4 w-4 text-zindo-green-400" />
            <p className="text-xs font-semibold uppercase tracking-widest">Console administrateur</p>
          </div>
          <p className="mt-1 text-sm text-slate-500">Accès réservé au propriétaire de la plateforme ZINDO</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
