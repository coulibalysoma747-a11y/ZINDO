# Cahier des charges — Module Cabinet médical / Clinique (ZINDO)

Ce document complète le cahier des charges général de ZINDO (`CLAUDE.md`) pour
l'activité `cabinet_medical` (voir `lib/activities.ts`). Il documente ce qui
existe déjà, la contrainte de conception qui encadre tout le module, et la
feuille de route.

## 1. Contrainte de conception : secret médical

ZINDO n'est **pas un dossier médical électronique (DME)**. Contrairement aux
autres activités (boutique, pharmacie...) où un client est identifié
nominativement, le module Cabinet médical enregistre un **registre
anonymisé** :

- pas de nom, prénom, téléphone ni adresse du patient ;
- un `patientCode` facultatif, choisi librement par le praticien (ex.
  `PAT-001`), qui ne doit jamais être une donnée d'identification directe ;
- les données conservées sont celles utiles au suivi épidémiologique et
  financier du cabinet : sexe, tranche d'âge, diagnostic, traitement, acte
  pratiqué, frais perçus.

Toute évolution future du module doit respecter cette contrainte tant que
ZINDO n'implémente pas un chiffrement dédié et un cadre de conformité
spécifique aux données de santé (voir §5, "Hors périmètre V1/V2").

## 2. Existant (déployé)

- Activité `cabinet_medical` sélectionnable à la création du commerce
  (`lib/activities.ts`).
- Permission `consultations.gerer` (`PERMISSIONS.CONSULTATIONS_MANAGE`).
- Flag `consultations_cabinet_medical` (`CONSULTATIONS_FLAG`), **désactivé
  par défaut**, activable par commerce/boutique depuis
  `/admin/fonctionnalites` — voir la règle "Feature rollout rule".
- Table `consultations` (patient_code, sex, age_group, diagnosis, treatment,
  fee, created_at).
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
utilisé pour les ventes (formats 58 mm / 80 mm / A4). Aucune identité
nominative n'y figure, conformément à la contrainte du §1.

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
peut : définir son catalogue d'actes et leurs tarifs → enregistrer une
consultation en 30 secondes (acte présélectionné, frais pré-rempli) →
imprimer/partager un reçu → suivre ses statistiques épidémiologiques et son
bilan financier par période, sans jamais collecter de donnée nominative.
