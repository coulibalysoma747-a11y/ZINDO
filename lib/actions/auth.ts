"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

export type ActionState = { error?: string } | undefined;

const loginSchema = z.object({
  identifier: z.string().min(3, "Renseignez votre téléphone ou e-mail"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ phone: identifier }, { email: identifier }],
    },
  });

  if (!user || !user.active) {
    return { error: "Identifiants incorrects" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Identifiants incorrects" };
  }

  await createSession({
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
  });

  redirect("/dashboard");
}

const registerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  password: z.string().min(6, "6 caractères minimum"),
  businessName: z.string().min(1, "Nom du commerce requis"),
  city: z.string().optional(),
});

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    password: formData.get("password"),
    businessName: formData.get("businessName"),
    city: formData.get("city") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const { firstName, lastName, phone, email, password, businessName, city } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { phone } });
  if (existing) {
    return { error: "Ce numéro de téléphone est déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { userId, businessId, role } = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: businessName,
        city,
      },
    });

    const user = await tx.user.create({
      data: {
        businessId: business.id,
        firstName,
        lastName,
        phone,
        email: email || undefined,
        passwordHash,
        role: "ADMIN",
      },
    });

    await tx.paymentMethodConfig.createMany({
      data: [
        { businessId: business.id, method: "ESPECES", label: "Espèces" },
        { businessId: business.id, method: "MOBILE_MONEY", label: "Mobile Money" },
        { businessId: business.id, method: "CARTE", label: "Carte bancaire" },
        { businessId: business.id, method: "CREDIT", label: "Crédit" },
      ],
    });

    await tx.category.createMany({
      data: [
        { businessId: business.id, name: "Général" },
      ],
    });

    await tx.location.create({
      data: {
        businessId: business.id,
        name: "Boutique principale",
        type: "BOUTIQUE",
        city,
        isDefault: true,
      },
    });

    const freePlan = await tx.subscriptionPlan.findUnique({ where: { key: "gratuit" } });
    if (freePlan) {
      await tx.businessSubscription.create({
        data: { businessId: business.id, planId: freePlan.id, billingCycle: "MONTHLY", status: "ACTIVE" },
      });
    }

    return { userId: user.id, businessId: business.id, role: user.role };
  });

  await createSession({ userId, businessId, role });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
