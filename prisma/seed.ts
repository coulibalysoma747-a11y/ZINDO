import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquant");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedSuperAdmin() {
  const email = "coulibalysoma747@gmail.com";
  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await bcrypt.hash("12345678", 10);
  await prisma.superAdmin.create({
    data: { email, passwordHash, name: "Coulibaly Soma", role: "FOUNDER" },
  });
  console.log(`Compte administrateur de la plateforme créé -> ${email}`);
}

async function main() {
  await seedSuperAdmin();

  const existing = await prisma.business.findFirst();
  if (existing) {
    console.log("La base contient déjà des données — seed des commerçants ignoré.");
    return;
  }

  const passwordHash = await bcrypt.hash("zindo1234", 10);

  const business = await prisma.business.create({
    data: {
      name: "Quincaillerie Somé",
      activity: "Quincaillerie",
      phone: "70 00 00 00",
      address: "Secteur 15",
      city: "Ouagadougou",
      country: "Burkina Faso",
      currency: "XOF",
    },
  });

  const admin = await prisma.user.create({
    data: {
      businessId: business.id,
      firstName: "Coulibaly",
      lastName: "Soma",
      phone: "70000000",
      email: "admin@zindo.bf",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.paymentMethodConfig.createMany({
    data: [
      { businessId: business.id, method: "ESPECES", label: "Espèces" },
      { businessId: business.id, method: "MOBILE_MONEY", label: "Mobile Money" },
      { businessId: business.id, method: "CARTE", label: "Carte bancaire" },
      { businessId: business.id, method: "CREDIT", label: "Crédit" },
    ],
  });

  const [depot, boutiqueOuaga, boutiqueBobo, boutiqueBanfora] = await Promise.all([
    prisma.location.create({
      data: { businessId: business.id, name: "Dépôt central", type: "DEPOT", city: "Ouagadougou" },
    }),
    prisma.location.create({
      data: {
        businessId: business.id,
        name: "Boutique Ouagadougou",
        type: "BOUTIQUE",
        city: "Ouagadougou",
        isDefault: true,
      },
    }),
    prisma.location.create({
      data: { businessId: business.id, name: "Boutique Bobo-Dioulasso", type: "BOUTIQUE", city: "Bobo-Dioulasso" },
    }),
    prisma.location.create({
      data: { businessId: business.id, name: "Boutique Banfora", type: "BOUTIQUE", city: "Banfora" },
    }),
  ]);

  const [freinage, electricite, general] = await Promise.all([
    prisma.category.create({ data: { businessId: business.id, name: "Freinage" } }),
    prisma.category.create({ data: { businessId: business.id, name: "Électricité" } }),
    prisma.category.create({ data: { businessId: business.id, name: "Général" } }),
  ]);

  const supplier = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: "SODIGAZ Distribution",
      company: "SODIGAZ",
      phone: "76 11 22 33",
      address: "Zone industrielle, Ouagadougou",
    },
  });

  const productData = [
    {
      name: "Plaquette de frein",
      categoryId: freinage.id,
      purchasePrice: 3000,
      salePrice: 4500,
      minStock: 5,
      unit: "pièce",
      stocks: { [depot.id]: 80, [boutiqueOuaga.id]: 25, [boutiqueBobo.id]: 10, [boutiqueBanfora.id]: 6 },
    },
    {
      name: "Disque de frein",
      categoryId: freinage.id,
      purchasePrice: 8000,
      salePrice: 11500,
      minStock: 4,
      unit: "pièce",
      stocks: { [depot.id]: 30, [boutiqueOuaga.id]: 12, [boutiqueBobo.id]: 5 },
    },
    {
      name: "Ampoule LED 12V",
      categoryId: electricite.id,
      purchasePrice: 500,
      salePrice: 1000,
      minStock: 10,
      unit: "pièce",
      stocks: { [depot.id]: 200, [boutiqueOuaga.id]: 60, [boutiqueBobo.id]: 40, [boutiqueBanfora.id]: 25 },
    },
    {
      name: "Batterie 12V 45Ah",
      categoryId: electricite.id,
      purchasePrice: 15000,
      salePrice: 22000,
      minStock: 5,
      unit: "pièce",
      stocks: { [depot.id]: 20, [boutiqueOuaga.id]: 3, [boutiqueBobo.id]: 4 },
    },
    {
      name: "Câble électrique 2.5mm (rouleau)",
      categoryId: general.id,
      purchasePrice: 12000,
      salePrice: 17000,
      minStock: 3,
      unit: "rouleau",
      stocks: { [depot.id]: 15, [boutiqueOuaga.id]: 0 },
    },
  ];

  let seq = 1;
  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        reference: `ZND-${String(seq).padStart(6, "0")}`,
        name: p.name,
        categoryId: p.categoryId,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        minStock: p.minStock,
        supplierId: supplier.id,
      },
    });
    seq += 1;

    for (const [locationId, quantity] of Object.entries(p.stocks)) {
      if (quantity <= 0) continue;
      await prisma.productStock.create({ data: { productId: product.id, locationId, quantity } });
      await prisma.stockMovement.create({
        data: {
          businessId: business.id,
          locationId,
          productId: product.id,
          direction: "IN",
          reason: "CORRECTION",
          quantity,
          oldStock: 0,
          newStock: quantity,
          userId: admin.id,
          note: "Stock initial (seed)",
        },
      });
    }
  }

  await prisma.business.update({ where: { id: business.id }, data: { nextProductSeq: seq } });

  const customer = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Moussa Traoré",
      phone: "70 XX XX XX",
      creditLimit: 100000,
    },
  });

  console.log("Seed terminé.");
  console.log(`Commerce : ${business.name}`);
  console.log(`Boutiques : ${depot.name}, ${boutiqueOuaga.name}, ${boutiqueBobo.name}, ${boutiqueBanfora.name}`);
  console.log(`Connexion admin -> téléphone: ${admin.phone} / mot de passe: zindo1234`);
  console.log(`Client de test : ${customer.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
