# Cahier des charges — Module Pharmacie (ZINDO)

Ce document complète le cahier des charges général de ZINDO (`CLAUDE.md`) pour
l'activité `pharmacie` (voir `lib/activities.ts`). Il part du cahier des
charges V1 générique (pensé pour un commerce quelconque) et l'adapte à la
réalité observée sur le terrain d'une officine/dépôt au Burkina Faso, sur le
même modèle que le module Cabinet médical
(`docs/cahier-des-charges-cabinet-medical.md`) : existant déployé, écart avec
le terrain, pistes d'évolution non implémentées à valider avant tout
développement.

## 1. Existant (déployé)

- Activité `pharmacie` sélectionnable à la création du commerce
  (`lib/activities.ts`), catégorie "Santé & beauté".
- Module **Péremption (DLC)** (`lib/actions/expiry.ts`, `lib/nav.ts`) :
  - visible uniquement pour les activités `pharmacie` et `supermarche`
    (`EXPIRY_ACTIVITIES`) ;
  - flag `EXPIRY_FLAG`, **désactivé par défaut**, activable par
    commerce/boutique depuis `/admin/fonctionnalites` (règle "Feature
    rollout rule") ;
  - permission dédiée `PERMISSIONS.EXPIRY_MANAGE` ;
  - table `product_expiry_batches` : chaque lot reçu a sa propre quantité et
    sa propre date de péremption, rattaché à un produit et à un emplacement
    (`locations`) — c'est déjà une gestion par lot, pas juste "un stock, une
    date".
- Le reste du parcours (produits, catégories, code-barres, stock, vente/
  caisse, ticket, clients, crédits, fournisseurs, achats, rapports) est le
  module générique de ZINDO décrit dans `CLAUDE.md`, commun à toutes les
  activités.

## 2. Écart entre le générique et le terrain

Le module générique (produit = une seule quantité, un seul prix d'achat, un
seul prix de vente) correspond à un commerce classique mais pas à la façon
dont une pharmacie/officine ou un dépôt de médicaments fonctionne réellement
au Burkina Faso :

### 2.1 Vente à l'unité (déconditionnement)

Très peu de clients achètent une boîte entière. La vente courante est "3
comprimés", "6 gélules", "une demi-plaquette" — le client paie ce dont il a
besoin pour le traitement, pas le conditionnement fournisseur. Le produit
générique ZINDO (une `unit` texte, une quantité) ne représente pas cette
hiérarchie boîte → plaquette → comprimé. Sans conversion d'unité, soit le
stock est faux dès la première vente au détail, soit le pharmacien doit
créer artificiellement plusieurs "produits" pour un même médicament.

### 2.2 Ordonnance non systématique

Réglementairement une ordonnance est requise pour de nombreux médicaments,
mais en pratique une bonne part des ventes se fait sans (dépannage,
automédication, produits en vente libre). Un module qui rendrait
l'ordonnance obligatoire pour valider une vente bloquerait l'usage réel de
l'officine. Le cabinet médical gère déjà, côté prescripteur, une ordonnance
non contraignante et purement informative (`consultation_items`, §3.5 du
doc Cabinet médical) — côté pharmacie, le lien serait plutôt : un champ
optionnel "réf. ordonnance / prescripteur" sur la vente, jamais bloquant.

### 2.3 FEFO à la vente, pas seulement à l'inventaire

`product_expiry_batches` permet déjà d'enregistrer plusieurs lots avec des
dates différentes pour un même produit. Ce qui manque pour coller au terrain :
au moment de la vente, le système devrait proposer/consommer en priorité le
lot qui expire le plus tôt (FEFO — First Expired, First Out), pas laisser le
vendeur choisir au hasard ou toujours taper dans le même lot. Aujourd'hui le
module Péremption est surtout un écran de suivi/alerte, pas encore branché
sur la logique de décrément au moment de l'encaissement.

### 2.4 Prix réglementés vs marge libre

Pour beaucoup de médicaments (notamment la liste des médicaments
essentiels/génériques), le prix de vente est encadré, pas libre. Pour la
parapharmacie (hygiène, compléments, matériel médical), la marge est libre
comme n'importe quel commerce. Le modèle produit générique ne distingue pas
ces deux régimes — aujourd'hui rien n'empêche (ni n'avertit) un vendeur de
modifier le prix d'un médicament à prix réglementé.

### 2.5 Fournisseurs multiples, prix d'achat variable

Les grossistes-répartiteurs (type Laborex, Ubipharm, DGRD...) connaissent des
ruptures fréquentes ; un même médicament est acheté tantôt chez l'un tantôt
chez l'autre, à un prix d'achat qui varie d'un arrivage à l'autre. Le module
Achats générique de ZINDO gère déjà plusieurs fournisseurs et un prix d'achat
par achat (pas un prix figé sur la fiche produit), ce qui couvre correctement
ce besoin — à vérifier seulement que le prix d'achat moyen/dernier prix
remonté dans les rapports reflète bien cette variabilité plutôt qu'un prix
unique fige.

### 2.6 Mobile Money dominant

En zone urbaine, Orange Money / Moov Money sont souvent plus utilisés que les
espèces. Le module générique prévoit déjà des moyens de paiement
configurables (§10 du cahier des charges général) — pour la pharmacie il
s'agit surtout de s'assurer que Mobile Money est proposé en position par
défaut, pas relégué en "Autre".

### 2.7 Continuité hors connexion

Une vente de médicament ne doit jamais être bloquée par une coupure réseau —
c'est encore plus critique qu'ailleurs (urgence, horaires de garde). Le
fonctionnement hors-ligne prévu au §24 du cahier des charges général
s'applique donc pleinement, sans dérogation, à l'activité pharmacie.

## 3. Pistes d'évolution (non implémentées — à valider avant tout développement)

Conformément à la règle "Feature rollout rule" (mémoire projet) : toute
fonctionnalité listée ici, si elle est développée, doit être planquée
derrière un `FeatureFlag` désactivé par défaut, et rester invisible hors de
l'activité `pharmacie` (et éventuellement `supermarche` pour ce qui touche à
la péremption). Rien ci-dessous n'est activé automatiquement pour les
commerçants existants.

1. **Unité de vente au détail** : ajouter au produit un rapport de
   conditionnement (ex. 1 boîte = 10 plaquettes = 100 comprimés) et permettre
   la vente/le décrément de stock dans n'importe laquelle de ces unités, avec
   conversion automatique.
2. **Champ ordonnance optionnel sur la vente** : numéro/prescripteur en texte
   libre, non bloquant, imprimé sur le ticket si renseigné.
3. **FEFO automatique à l'encaissement** : quand plusieurs lots
   (`product_expiry_batches`) existent pour un produit vendu, décrémenter en
   priorité le lot dont la date de péremption est la plus proche, et
   remonter une alerte si le lot choisi expire avant une date seuil.
4. **Marquage "prix réglementé"** sur la fiche produit, avec avertissement
   (pas blocage) si le prix de vente saisi diffère du prix de référence.
5. **Registre des substances réglementées** (stupéfiants/psychotropes) si un
   pharmacien titulaire en confirme le besoin — implique une traçabilité
   renforcée (qui, quand, combien) au-delà du mouvement de stock standard.

Ces pistes restent des propositions d'adaptation au terrain, pas un
engagement de développement — chacune doit être confirmée séparément par le
porteur du produit avant implémentation, comme pour le module Cabinet
médical.

## 4. Hors périmètre

- Tiers payant / assurance maladie (CNAMU ou assurance privée).
- Gestion des rappels de lot fournisseur au-delà du suivi de péremption déjà
  en place.
- Tout ce qui relève de la réglementation d'exercice de la pharmacie
  elle-même (habilitation du titulaire, etc.) : ZINDO est un outil de
  gestion de stock/caisse, pas un système de conformité réglementaire.
