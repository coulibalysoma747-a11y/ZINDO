// Contenu des pages publiques « Fonctionnalités » (app/fonctionnalites/).
// Pages destinées au référencement : chaque page décrit une fonctionnalité
// réellement disponible dans ZINDO — ne rien y promettre qui n'existe pas
// dans l'application, Google (et ses résumés IA) reprennent ce texte tel quel.

export type SeoSection = {
  title: string;
  text: string;
  points?: string[];
};

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoPage = {
  slug: string;
  /** Libellé court (menu, cartes du hub). */
  label: string;
  /** Balise <title> — mots-clés recherchés en premier. */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "logiciel-gestion-pme",
    label: "Pour les PME",
    metaTitle: "Logiciel de gestion de stock et de caisse pour PME au Burkina Faso",
    metaDescription:
      "ZINDO, logiciel de gestion pour PME au Burkina Faso : stock multi-dépôts, caisse, factures avec IFU et RCCM, crédits clients, employés avec permissions, rapports. Sur PC et mobile.",
    h1: "Le logiciel de gestion pour PME, conçu au Burkina Faso",
    intro:
      "Quand un commerce grandit, le cahier ne suffit plus : plusieurs vendeurs, plusieurs dépôts, des clients à crédit, des fournisseurs à payer. ZINDO réunit tout cela dans une seule application, sur ordinateur comme sur téléphone, tout en restant simple dès le premier jour.",
    sections: [
      {
        title: "Plusieurs employés, chacun ses droits",
        text: "Créez un compte pour chaque employé et choisissez, module par module, ce qu'il peut voir et faire. Un vendeur encaisse sans voir vos prix d'achat ni vos bénéfices.",
        points: [
          "Rôles administrateur, vendeur, gestionnaire de stock — permissions ajustables",
          "Ouverture et clôture de caisse par session, avec contrôle des écarts",
          "Historique de toutes les opérations : qui a fait quoi, et quand",
        ],
      },
      {
        title: "Plusieurs boutiques et dépôts",
        text: "Chaque boutique ou dépôt a son propre stock. Transférez de la marchandise de l'un à l'autre et gardez une vue d'ensemble depuis le même compte.",
      },
      {
        title: "Des documents commerciaux professionnels",
        text: "Devis, factures A4 et tickets de caisse portent le nom, le logo, l'IFU et le RCCM de votre entreprise, avec un QR code de vérification.",
      },
      {
        title: "Des chiffres pour décider",
        text: "Chiffre d'affaires, marge, bénéfices, valeur du stock, dépenses, meilleures ventes : les rapports se calculent tout seuls à partir de vos opérations.",
      },
      {
        title: "Achats, fournisseurs et crédits",
        text: "Enregistrez vos réceptions fournisseurs (le stock augmente automatiquement), suivez ce que vos clients vous doivent et relancez-les par WhatsApp en un clic.",
      },
    ],
    faqs: [
      {
        question: "ZINDO est-il adapté aux PME ou seulement aux petites boutiques ?",
        answer:
          "Les deux. Une petite boutique peut commencer seule en quelques minutes ; une PME ajoute ses employés avec des permissions, ses boutiques et dépôts, ses fournisseurs et utilise les factures, les devis et les rapports.",
      },
      {
        question: "ZINDO fonctionne-t-il sur ordinateur ?",
        answer:
          "Oui. ZINDO fonctionne sur ordinateur Windows (application de bureau ou navigateur), ainsi que sur téléphone et tablette Android et iOS. Les données sont les mêmes sur tous les appareils.",
      },
      {
        question: "Combien d'employés puis-je ajouter ?",
        answer:
          "L'abonnement inclut plusieurs utilisateurs et plusieurs boutiques. Chaque employé a son propre identifiant et ses propres droits.",
      },
    ],
  },
  {
    slug: "credits-clients",
    label: "Crédits clients",
    metaTitle: "Gestion des crédits clients et des dettes — ZINDO",
    metaDescription:
      "Vendez à crédit sans carnet : ZINDO enregistre qui vous doit de l'argent, combien et depuis quand, suit les remboursements et relance vos clients par WhatsApp.",
    h1: "Suivez les crédits de vos clients, sans carnet",
    intro:
      "Au Burkina Faso, vendre à crédit fait partie du commerce. Le problème, c'est de s'en souvenir. Avec ZINDO, chaque vente à crédit est rattachée au client, et vous savez à tout moment combien on vous doit.",
    sections: [
      {
        title: "Une vente à crédit en un geste",
        text: "À la caisse, choisissez « crédit » comme moyen de paiement et sélectionnez le client. Le montant dû s'ajoute automatiquement à sa fiche.",
      },
      {
        title: "Qui doit combien, depuis quand",
        text: "L'écran des crédits affiche le total des sommes dues et la liste des clients débiteurs, avec la date de chaque vente et le reste à payer.",
        points: [
          "Remboursements partiels ou complets enregistrés sur la fiche client",
          "Historique des achats et des paiements de chaque client",
          "Total des crédits en cours visible d'un coup d'œil",
        ],
      },
      {
        title: "Relance WhatsApp en un clic",
        text: "Depuis l'écran des rappels, envoyez à un client un message WhatsApp déjà rédigé avec le montant qu'il doit. Poli, rapide, sans oubli.",
      },
    ],
    faqs: [
      {
        question: "Peut-on accepter un paiement partiel sur un crédit ?",
        answer:
          "Oui. Chaque remboursement, même partiel, est enregistré et le reste à payer du client se met à jour automatiquement.",
      },
      {
        question: "Un vendeur peut-il voir les dettes des clients ?",
        answer:
          "Seulement si vous lui en donnez le droit. Les permissions se règlent employé par employé.",
      },
    ],
  },
  {
    slug: "facturation",
    label: "Factures et devis",
    metaTitle: "Logiciel de facturation et de devis avec IFU et RCCM — ZINDO",
    metaDescription:
      "Créez devis, factures A4 et tickets de caisse professionnels avec votre logo, IFU, RCCM et un QR code de vérification. Impression thermique 58/80 mm ou A4, partage PDF.",
    h1: "Des factures et des devis professionnels, en quelques secondes",
    intro:
      "Une facture propre inspire confiance. ZINDO génère vos documents à partir de vos ventes, avec les informations légales de votre entreprise, prêts à imprimer ou à envoyer.",
    sections: [
      {
        title: "Devis, puis vente",
        text: "Préparez un devis pour un client, envoyez-le, puis transformez-le en vente lorsqu'il est accepté — sans ressaisir les articles.",
      },
      {
        title: "Factures A4 et tickets de caisse",
        text: "Choisissez parmi plusieurs modèles de facture élégants. Chaque document porte votre nom commercial, votre logo, votre IFU et votre RCCM si vous en avez.",
        points: [
          "Tickets pour imprimantes thermiques 58 mm et 80 mm",
          "Factures A4 pour imprimante classique",
          "Enregistrement en PDF et partage au client",
        ],
      },
      {
        title: "Un QR code contre les fausses factures",
        text: "Chaque facture comporte un QR code : votre client, ou toute personne qui la reçoit, peut vérifier en ligne qu'elle a bien été émise par votre commerce.",
      },
    ],
    faqs: [
      {
        question: "Faut-il un IFU pour utiliser les factures de ZINDO ?",
        answer:
          "Non. L'IFU et le RCCM sont facultatifs : s'ils sont renseignés dans les paramètres, ils apparaissent sur vos documents ; sinon, la facture reste valable comme justificatif de vente.",
      },
      {
        question: "Quelles imprimantes sont compatibles ?",
        answer:
          "Les imprimantes thermiques de tickets (58 mm et 80 mm) et les imprimantes classiques A4. Vous pouvez aussi enregistrer le document en PDF.",
      },
    ],
  },
  {
    slug: "caisse-hors-ligne",
    label: "Caisse hors ligne",
    metaTitle: "Logiciel de caisse qui fonctionne sans Internet — ZINDO",
    metaDescription:
      "Une coupure d'Internet ne bloque plus vos ventes : la caisse ZINDO continue d'encaisser hors ligne et synchronise tout dès que la connexion revient.",
    h1: "Continuez à vendre, même sans connexion",
    intro:
      "Les coupures de réseau arrivent. Avec ZINDO, elles n'arrêtent pas votre caisse : vous encaissez normalement et tout se synchronise lorsque la connexion revient.",
    sections: [
      {
        title: "Une caisse rapide",
        text: "Recherchez un produit par nom, référence ou code-barres, ajoutez-le au panier, appliquez une remise et encaissez — espèces, mobile money, carte ou crédit.",
      },
      {
        title: "Hors ligne, puis synchronisé",
        text: "Sans connexion, les ventes sont conservées sur l'appareil. Dès que le réseau revient, elles sont envoyées automatiquement et votre stock se met à jour.",
      },
      {
        title: "Lecteur de codes-barres",
        text: "Scannez avec la caméra du téléphone ou branchez un lecteur de codes-barres sur votre ordinateur. Les produits sans code-barres se vendent par leur référence.",
      },
    ],
    faqs: [
      {
        question: "Que se passe-t-il si Internet coupe pendant une vente ?",
        answer:
          "La vente est enregistrée sur l'appareil puis synchronisée automatiquement dès que la connexion revient. Vous n'avez rien à ressaisir.",
      },
    ],
  },
  {
    slug: "gestion-de-stock",
    label: "Stock et inventaire",
    metaTitle: "Gestion de stock et inventaire pour boutiques et dépôts — ZINDO",
    metaDescription:
      "Stock en temps réel, alertes de rupture, entrées et sorties tracées, inventaire avec calcul des écarts et transferts entre dépôts. Remplacez vos cahiers par ZINDO.",
    h1: "Un stock juste, en temps réel",
    intro:
      "Chaque vente, achat ou transfert met votre stock à jour instantanément. Vous savez ce que vous avez, ce qu'il vaut et ce qu'il faut racheter.",
    sections: [
      {
        title: "Chaque mouvement est tracé",
        text: "Entrées, sorties, pertes, casse, retours : chaque mouvement enregistre la date, la quantité, l'employé, le motif, l'ancien et le nouveau stock.",
      },
      {
        title: "Alertes avant la rupture",
        text: "Fixez un stock minimum par produit. ZINDO vous prévient dès qu'il est atteint, avant que la rupture ne vous fasse perdre une vente.",
      },
      {
        title: "Inventaire avec calcul des écarts",
        text: "Comptez ce qui est réellement en rayon : ZINDO compare avec le stock théorique, affiche les écarts et corrige le stock après validation.",
      },
      {
        title: "Plusieurs dépôts",
        text: "Un stock par boutique ou dépôt, des transferts de marchandise entre eux, et la valeur totale du stock calculée automatiquement.",
      },
    ],
    faqs: [
      {
        question: "Mes produits doivent-ils avoir un code-barres ?",
        answer:
          "Non. Chaque produit reçoit une référence unique ; le code-barres est facultatif.",
      },
    ],
  },
];

export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}
