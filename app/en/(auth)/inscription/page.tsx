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
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Create your business</h2>
          <p className="text-sm text-zinc-500">Get started with ZINDO in seconds</p>
        </div>
        <RegisterForm locale="en" />
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/en/login" className="font-medium text-emerald-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
