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
fois saisi, le nom du patient apparaît aussi sur le reçu imprimable (§3.2).
Cette exception est un choix produit assumé par le porteur du projet
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

### 3.2 Reçu de consultation imprimable

Section 11 du cahier des charges général de ZINDO ("Ticket de caisse")
s'applique aussi au cabinet médical : après une consultation, un reçu
(numéro, date, acte/diagnostic, montant, mode de paiement implicite espèces)
peut être imprimé ou partagé, en réutilisant le composant `Receipt` déjà
utilisé pour les ventes (formats 58 mm / 80 mm / A4). Le nom du patient n'y
figure que si le praticien l'a saisi (§1) — sinon le reçu reste anonyme.

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
- **Ordonnances imprimables** structurées (posologie, durée du traitement),
  au-delà du champ libre "traitement" actuel.
- **Dossier patient longitudinal** (historique multi-consultations lié à un
  même patient identifié) — contradictoire avec l'anonymisation actuelle,
  demanderait une refonte du modèle de données et un cadre légal dédié.
- **Multi-praticiens avec agenda partagé** et **tiers payant / assurance
  maladie**.
- **Stock de médicaments/consommables du cabinet** : le module `Péremption
  (DLC)` et le stock générique de ZINDO peuvent déjà couvrir ce besoin pour
  un cabinet qui vend/dispense des produits, sans développement dédié.

## 6. Résultat attendu de cette itération

Un cabinet médical/clinique qui active le flag `consultations_cabinet_medical`
peut : définir son catalogue d'actes et leurs tarifs, ainsi que sa liste de
diagnostics courants → enregistrer une consultation en 30 secondes (numéro de
patient auto-généré, acte et diagnostic choisis dans une liste, frais
pré-rempli, nom/âge du patient facultatifs) → imprimer/partager un reçu →
suivre ses statistiques épidémiologiques et son bilan financier par période —
en choisissant lui-même, consultation par consultation, de rester anonyme ou
non.
