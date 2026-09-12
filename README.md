# ZINDO

Application de gestion de stock et de ventes pour les commerces (boutiques, quincailleries,
ateliers, grossistes...) au Burkina Faso. V1 — voir [CLAUDE.md](./CLAUDE.md) pour le cahier
des charges complet.

## Stack technique

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** pour l'interface
- **Prisma ORM 7** (driver adapters) + **SQLite** (`better-sqlite3`) comme base de données —
  facilement migrable vers PostgreSQL en production (voir `prisma/schema.prisma` et
  `prisma.config.ts`)
- Authentification par session JWT (cookie httpOnly, `jose`), mots de passe hashés avec `bcryptjs`
- `proxy.ts` (anciennement middleware) protège toutes les routes authentifiées

## Démarrage

```bash
npm install
npm run db:push      # crée la base SQLite à partir du schéma Prisma
npm run db:seed       # données de démonstration (commerce, produits, client)
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Le seed crée un compte administrateur :

- Téléphone : `70000000`
- Mot de passe : `zindo1234`

Ou créez votre propre commerce via **Créer un commerce** sur l'écran de connexion.

Pour activer le chat de l'**Assistant IA** (`/assistant`), ajoutez votre clé dans `.env` :

```bash
ANTHROPIC_API_KEY="sk-ant-..."
```

Les conseils automatiques de la même page fonctionnent sans cette clé.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarre le build de production |
| `npm run lint` | ESLint |
| `npm run db:push` | Synchronise le schéma Prisma avec la base SQLite |
| `npm run db:seed` | Insère des données de démonstration |
| `npm run db:studio` | Ouvre Prisma Studio pour explorer les données |

## Fonctionnalités couvertes (V1)

- Comptes & authentification, rôles (Administrateur / Vendeur / Gestionnaire de stock) avec
  permissions configurables (**Paramètres > Rôles et permissions**)
- Tableau de bord (CA jour/mois, bénéfice, stock, alertes)
- Produits (CRUD, référence auto ZND-000001, code-barres avec scan caméra, catégories)
- Stock (entrées/sorties motivées, historique, valeur de stock)
- Vente / Caisse (panier, remise, client, plusieurs moyens de paiement, crédit/paiement
  partiel), ticket imprimable / PDF / partageable (58mm, 80mm, A4)
- Clients (fiche, historique d'achats, crédits, remboursements)
- Fournisseurs & Achats (réception de marchandise, mise à jour automatique du stock)
- Inventaire (comptage réel vs théorique, validation des écarts)
- Historique global filtrable et Rapports (ventes, stock, achats, bénéfices)
- Paramètres du commerce (devise, ticket, moyens de paiement, seuil de stock, permissions)
- **Multi-boutiques / multi-dépôts** : le stock est suivi par emplacement (`ProductStock`).
  Un sélecteur en haut de l'écran change la boutique active ; ventes, achats, entrées/sorties
  et inventaires s'appliquent à la boutique sélectionnée. Le tableau de bord affiche la valeur
  du stock de chaque boutique côte à côte. **Transferts** (`/transferts`) déplace la marchandise
  d'un emplacement à un autre en une opération, en décrémentant la source et en incrémentant la
  destination avec traçabilité complète dans les mouvements de stock.
- **Assistant IA commercial** (`/assistant`) : conseils automatiques (risque de rupture de
  stock, tendances de ventes par catégorie, produits à faible marge) calculés directement à
  partir des données — aucune clé API requise pour cette partie. Un chat permet en plus de
  poser des questions libres ("Quels sont mes produits les plus rentables ?") ; Claude
  interroge alors la base via des outils en lecture seule pour répondre avec de vrais chiffres.
  Nécessite une clé `ANTHROPIC_API_KEY` dans `.env` (voir ci-dessous) — sans elle, la page
  affiche simplement un message d'installation au lieu des réponses au chat.

## Notes d'architecture

- Prisma 7 utilise les **driver adapters** : la connexion se configure dans `lib/prisma.ts`
  (adapter `@prisma/adapter-better-sqlite3`) et non plus via `url` dans `schema.prisma`.
  Les commandes CLI (`db push`, migrations) lisent la config depuis `prisma.config.ts`.
- Toutes les mutations passent par des Server Actions (`lib/actions/*.ts`), avec vérification
  systématique de permission côté serveur (`requirePermission`).
- Le fonctionnement hors-ligne complet et la synchronisation cloud (sections 24-25 du cahier
  des charges) sont prévus pour une itération ultérieure ; l'architecture (SQLite local,
  actions serveur isolées par commerce) est compatible avec cette évolution.
