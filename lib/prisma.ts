import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL manquant");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

// Client paresseux : la connexion (et la vérification de DATABASE_URL) n'a
// lieu qu'au premier accès réel, jamais au simple `import`. `next build`
// charge chaque route (y compris celles qui n'exécutent aucune requête au
// build) pour en collecter la configuration — sans cette paresse, un
// DATABASE_URL absent ferait échouer le build entier plutôt que seulement
// les requêtes qui en ont besoin au runtime.
export const prisma: PrismaClient = new Proxy(Object.create(PrismaClient.prototype) as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
