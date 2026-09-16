import { AuthShell } from "@/components/auth/AuthShell";

export default function EnglishAuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell locale="en">{children}</AuthShell>;
}
