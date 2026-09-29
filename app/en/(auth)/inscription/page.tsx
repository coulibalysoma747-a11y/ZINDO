import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { RegisterForm } from "@/app/(auth)/inscription/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  alternates: { canonical: "/en/inscription" },
};

export default function EnglishRegisterPage() {
  return (
    <Card>
      <CardBody className="space-y-5">
        <RegisterForm locale="en" />
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/en/login" className="font-semibold text-zindo-green-700 hover:underline">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
