# Cahier des charges — Module Cabinet médical / Clinique (ZINDO)

Ce document complète le cahier des charges général de ZINDO (`CLAUDE.md`) pour
l'activité `cabinet_medical` (voir `lib/activities.ts`). Il documente ce qui
existe déjà, la contrainte de conception qui encadre tout le module, et la
feuille de route.

## 1. Contrainte de conception : secret médical (registre anonyme par défaut)

ZINDO n'est **pas un dossier médical électronique (DME)**. Par défaut, le
module Cabinet médical enregistre un **registre anonymisé** : sexe, tranche
d'âge, diagnostic, traitement, acte pratiqué, frais perçus, plus un numéro de
patient (`patientCode`, ex. `PAT-00001`) qui n'est jamais une donnée
d'identification directe. Depuis la V2 (§3.3), ce numéro est **généré
automatiquement** par le système (séquence par commerce, voir
`lib/reference.ts`) — le praticien ne le saisit plus lui-même, ce qui
garantit qu'il reste unique et cohérent même si le nom du patient n'est pas
renseigné.

**Exception explicitement demandée** : le praticien peut, s'il le souhaite,
renseigner le **nom** et l'**âge exact** du patient — deux champs facultatifs,
distincts du sexe/tranche d'âge/`patientCode` qui restent, eux, pensés pour
un usage anonyme. Laissés vides, le registre reste anonyme comme avant. Une
fois saisi, le nom du patient apparaît aussi sur l'ordonnance imprimable
(§3.5). Cette exception est un choix produit assumé par le porteur du projet
(Coulibaly Soma) : elle sort ZINDO du régime "aucune donnée nominative" pour
les cabinets qui préfèrent tenir un vrai registre nominatif — libre à chaque
cabinet de ne pas utiliser ces deux champs.

Toute évolution future qui multiplierait les données nominatives (historique
patient complet, coordonnées...) doit rester consciente de l'absence de
chiffrement dédié et de cadre de conformité santé (voir §5, "Hors périmètre
V1/V2").

## 2. Existant (déployé)

- Activité `cabinet_medical` sélectionnable à la création du commerce
  (`lib/activities.ts`).
- Permission `consultations.gerer` (`PERMISSIONS.CONSULTATIONS_MANAGE`).
- Flag `consultations_cabinet_medical` (`CONSULTATIONS_FLAG`), **désactivé
  par défaut**, activable par commerce/boutique depuis
  `/admin/fonctionnalites` — voir la règle "Feature rollout rule".
- Table `consultations` (patient_code, patient_name, patient_age, sex,
  age_group, diagnosis, treatment, fee, created_at) — `patient_name` et
  `patient_age` sont facultatifs (§1).
- Écrans : `/consultations` (registre), `/consultations/nouvelle`
  (saisie), `/consultations/statistiques` (bilan + pathologies fréquentes +
  profil patientèle), `/consultations/export` (export CSV).
- Les charges du cabinet réutilisent le module `Dépenses` déjà existant.

## 3. Ajouté dans cette itération (V2)

### 3.1 Catalogue des actes médicaux

Un cabinet facture rarement "à la tête du patient" : le tarif dépend du type
d'acte (consultation générale, consultation spécialisée, pansement,
injection, suivi de grossesse, vaccination...), indépendamment du diagnostic
retenu. Le diagnostic reste un champ libre à visée épidémiologique ; l'acte
devient un champ structuré à visée tarifaire.

- Table `medical_acts` (nom, tarif par défaut) gérée par le praticien, sur le
  même modèle que le catalogue de catégories produits.
- Écran `/consultations/actes` pour créer/modifier/supprimer les actes.
- Le formulaire de consultation propose désormais un sélecteur d'acte
  (facultatif) qui pré-remplit le montant des frais ; l'acte reste
  modifiable à la volée.
- Les statistiques et l'export CSV intègrent la répartition par acte.

### 3.2 Pas de « reçu » de consultation — correction explicite

Une première version reprenait ici la section 11 du cahier des charges
général de ZINDO ("Ticket de caisse") pour générer un reçu de paiement
imprimable après chaque consultation (comme un ticket de caisse). **Retiré
sur demande explicite** : un cabinet médical n'a pas de "reçu" au sens
commerce — le document que le médecin remet au patient est l'**ordonnance**
(§3.5), pas une preuve de paiement. La route et l'action dédiées au reçu de
consultation ont été supprimées ; le montant des frais reste visible dans le
registre (`/consultations`) et les statistiques (§2), simplement sans
document imprimable séparé pour le paiement.

### 3.3 Numéro de patient auto-généré

Demande explicite : le numéro de patient (ex. `PAT-00001`) n'est plus saisi
manuellement. Il est généré par une séquence par commerce (`businesses.
next_patient_seq`, incrémentée atomiquement par la fonction Postgres
`increment_business_seq` déjà utilisée pour les références produit/vente —
voir `lib/reference.ts` `generatePatientCode`), ce qui garantit l'unicité et
la continuité même quand le nom du patient (facultatif) n'est pas renseigné.

### 3.4 Diagnostic sous forme de catégories

Demande explicite : le médecin doit pouvoir choisir le diagnostic dans une
liste plutôt que de le retaper en texte libre à chaque consultation. Table
`diagnosis_categories` (nom, par commerce) gérée depuis
`/consultations/diagnostics`, sur le même principe que `medical_acts` (§3.1)
et que les marques produit (`brands`) : `consultations.diagnosis` reste un
simple champ texte (utilisé tel quel pour les statistiques épidémiologiques,
§2), la table ne fait qu'alimenter le sélecteur avec création à la volée
(composant `EntityQuickSelect`, déjà utilisé pour Catégorie/Marque sur la
fiche produit). Renommer une catégorie réaligne rétroactivement les
consultations déjà enregistrées portant l'ancien libellé exact, pour ne pas
fausser le classement des pathologies fréquentes.

### 3.5 Ordonnance : prescription directement en consultation

Demande explicite : le médecin doit pouvoir prescrire directement pendant la
saisie de la consultation, plutôt que de tout décrire en texte libre dans
"Traitement". **Correction explicite reçue après une première version** :
une ordonnance n'est pas forcément un produit du catalogue Produits — le
médecin décrit très souvent librement un médicament et son dosage (ex.
« Paracétamol 1000 mg ») sans que ce médicament existe dans son catalogue de
gestion de stock. Les deux façons de prescrire **cohabitent**, au choix du
médecin, ligne par ligne :

1. **Description libre** (nom + dosage tapés directement, ex. « Paracétamol
   1000 mg ») — le cas le plus courant, aucun lien avec le catalogue Produits.
2. **Choix dans le catalogue Produits** existant (réutilise `ProductPicker`,
   déjà utilisé par Approvisionnement rapide/Achats/Transferts...) — pour un
   cabinet qui gère aussi son propre stock de médicaments/consommables.

Dans les deux cas, chaque ligne a sa quantité et sa posologie (facultative,
ex. « 2x/jour pendant 5 jours »).

- Table `consultation_items` (produit **ou** description libre, quantité,
  posologie), rattachée à une consultation — `product_id` et `custom_name`
  sont tous les deux nullables, une contrainte SQL impose qu'au moins l'un
  des deux soit renseigné.
- Écran imprimable dédié `/consultations/[id]/ordonnance` (mise en page A4
  façon document officiel, calquée sur `components/sales/Facture.tsx`) : nom
  du cabinet, patient, diagnostic, tableau des lignes prescrites (catalogue
  ou libres, affichées de façon identique), ligne de signature/cachet.
  Accessible depuis le registre dès qu'une consultation a au moins une ligne
  d'ordonnance.
- **Choix assumé : l'ordonnance ne touche jamais le stock.** C'est un
  document informatif que le patient emporte (achat en pharmacie externe),
  pas une vente. Un cabinet qui dispense lui-même ses médicaments et veut
  déduire son propre stock au moment de la consultation devra le faire via
  le module Stock/Vente générique déjà existant — sujet distinct, à traiter
  séparément si le besoin est confirmé (voir §5).

### 3.6 Préréglages de posologie

Demande explicite : le médecin doit pouvoir "ajouter comme marque" (même
principe que le sélecteur Marque de la fiche produit) la façon dont le
patient doit prendre chaque produit — ex. « 1 par jour », « 2 par jour »,
« 1 le matin et 1 le soir » — au lieu de retaper la même consigne à chaque
ordonnance.

- Table `posology_presets` (libellé, par commerce), même principe que
  `diagnosis_categories` (§3.4) : `consultation_items.posology` reste un
  simple champ texte, la table ne fait qu'alimenter un sélecteur.
- Écran `/consultations/posologies` pour gérer la liste complète.
- Sur chaque ligne d'ordonnance du formulaire de consultation, un sélecteur
  "Posologie fréquente" pré-remplit le champ texte ; un bouton dédié permet
  aussi d'enregistrer la posologie tapée à la volée comme nouveau préréglage
  (utilisable immédiatement sur les autres lignes, sans quitter le
  formulaire). Aucun préréglage n'est fourni par défaut — comme les autres
  catalogues du module (actes, diagnostics), la liste se construit par le
  médecin au fil de l'usage.

## 4. Permissions et activation

- Reste sous la permission unique `consultations.gerer` et le flag existant
  `consultations_cabinet_medical` (aucune nouvelle fonctionnalité "orpheline"
  n'est activée par défaut — voir la mémoire "Feature rollout rule").
- Reste invisible hors de l'activité `cabinet_medical`.

## 5. Hors périmètre V1/V2 (vision future, non implémenté)

Ces éléments correspondent à la vision long terme d'un vrai logiciel de
gestion de cabinet, mais impliquent des données de santé nominatives et donc
un chantier de conformité (chiffrement au repos, journalisation d'accès
renforcée, durée de conservation réglementaire, consentement) qui dépasse le
cadre du registre anonymisé actuel. À ne pas démarrer sans validation
explicite du porteur du produit :

- **Rendez-vous / agenda** : prise de rendez-vous par créneau, rappels SMS.
  Nécessite une identité minimale (nom + téléphone) — pourrait réutiliser le
  module `Clients` existant plutôt qu'un nouveau modèle "patient".
- **Dossier patient longitudinal** (historique multi-consultations lié à un
  même patient identifié) — contradictoire avec l'anonymisation actuelle,
  demanderait une refonte du modèle de données et un cadre légal dédié.
- **Multi-praticiens avec agenda partagé** et **tiers payant / assurance
  maladie**.
- **Déduction de stock à la prescription** (dispensation directe par le
  cabinet) : l'ordonnance (§3.5) reste volontairement informative et ne
  déduit rien du stock. Le module Stock/Vente générique de ZINDO couvre déjà
  ce besoin pour un cabinet qui vend/dispense lui-même ses produits, sans
  développement dédié — le module `Péremption (DLC)` reste aussi disponible
  pour le suivi des dates de péremption de ce stock.

## 6. Résultat attendu de cette itération

Un cabinet médical/clinique qui active le flag `consultations_cabinet_medical`
peut : définir son catalogue d'actes et leurs tarifs, ainsi que sa liste de
diagnostics courants → enregistrer une consultation en 30 secondes (numéro de
patient auto-généré, acte et diagnostic choisis dans une liste, frais
pré-rempli, nom/âge du patient facultatifs) → prescrire directement des
produits de son catalogue ou décrits librement, avec quantité et posologie →
imprimer/partager l'ordonnance → suivre ses statistiques épidémiologiques et
son bilan financier par période — en choisissant lui-même, consultation par
consultation, de rester anonyme ou non.

## 7. Interface épurée : Aide/Support et Paramètres

Demande explicite : un cabinet médical ne doit pas voir, dans **Aide &
support** et **Paramètres**, des fonctionnalités qui « ne marchent pas »
chez lui (pensées pour une boutique avec caisse/stock/vente, sans lien avec
le fonctionnement d'un cabinet).

- **Aide & support** (`ModulesGuide`) : un module dont l'activité requise
  (`requireActivity`, `lib/nav.ts`) ne correspond pas à celle du commerce
  n'apparaît plus du tout dans le guide — auparavant il restait visible,
  grisé, avec la mention « Ce module ne s'applique pas à votre type
  d'activité ». Ce changement est générique (pas seulement pour le cabinet
  médical) : une boutique générale ne voit plus non plus, par exemple, Vente
  Engin ou Péremption (DLC) dans son guide.
- **Paramètres** : pour l'activité `cabinet_medical` spécifiquement (le
  reste de ZINDO n'est pas concerné) :
  - la carte "Intégration FasoStock" est masquée (synchronisation de stock
    boutique, sans objet) ;
  - la carte "Règles de vente" est remplacée par une carte "Dépenses" qui ne
    garde que les catégories de dépenses (seul réglage de cette section
    réellement utilisé, par le bilan financier de
    `/consultations/statistiques`) — le reste (leaderboard vendeurs, mode de
    saisie quantité à la caisse, packaging, IA panier...) disparaît ;
  - la carte "Modules" (activables/désactivables : devis, prix de revient,
    photos produits, rappels crédit, réassort, approvisionnement rapide,
    enlèvements, expéditions, caisse à deux) est masquée : aucun de ces
    interrupteurs n'a de sens pour le parcours consultation.
  - Restent visibles pour tous, y compris le cabinet médical : Mon activité,
    Commerce, Moyens de paiement, Devise, Rôles et permissions, zone de
    danger — réglages génériques toujours pertinents, y compris si le
    cabinet utilise malgré tout les modules génériques Vente/Stock/Achats
    (§5, "Déduction de stock à la prescription").
