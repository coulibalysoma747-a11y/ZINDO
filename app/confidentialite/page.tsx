import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  alternates: { canonical: "/confidentialite" },
};

const UPDATED_AT = "16 septembre 2026";

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Responsable du traitement">
        <p>
          ZINDO est édité par Coulibaly Soma. Pour toute question relative à vos données personnelles, contactez-nous
          via WhatsApp :{" "}
          <a
            href="https://wa.me/22604059929"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zindo-green-600 hover:underline"
          >
            +226 04 05 99 29
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données que nous collectons">
        <p>À la création de votre compte : nom, prénom, numéro de téléphone, e-mail (facultatif), mot de passe (stocké de façon chiffrée), nom et activité de votre commerce, ville.</p>
        <p>
          Dans le cadre de l&apos;utilisation du service : les données que vous saisissez vous-même (produits,
          ventes, clients, fournisseurs, achats) ainsi que des données techniques (historique des actions,
          journal de connexion) nécessaires à la sécurité et au fonctionnement du service.
        </p>
      </LegalSection>

      <LegalSection title="3. Pourquoi nous utilisons ces données">
        <ul className="list-disc space-y-1 pl-5">
          <li>Faire fonctionner votre compte et le service ZINDO (caisse, stock, rapports...) ;</li>
          <li>Vous contacter au sujet de votre compte ou de votre abonnement ;</li>
          <li>Assurer la sécurité du service (rôles, permissions, historique des actions, prévention de la fraude) ;</li>
          <li>Améliorer le service (statistiques d&apos;usage agrégées) ;</li>
          <li>Respecter nos obligations légales.</li>
        </ul>
        <p>Nous ne vendons pas vos données personnelles à des tiers.</p>
      </LegalSection>

      <LegalSection title="4. Partage des données">
        <p>
          Vos données sont hébergées chez nos prestataires techniques (hébergement, base de données, envoi
          d&apos;e-mails) dans la seule mesure nécessaire au fonctionnement de ZINDO. Si vous activez vous-même une
          intégration tierce optionnelle (ex. synchronisation FasoStock), les données correspondantes sont échangées
          avec ce service selon les modalités que vous configurez.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservation des données">
        <p>
          Vos données sont conservées pendant toute la durée d&apos;utilisation de votre compte, puis pour la durée
          nécessaire au respect de nos obligations légales (notamment comptables), avant suppression ou
          anonymisation.
        </p>
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <p>
          Conformément à la loi n° 001-2021/AN portant protection des données à caractère personnel au Burkina Faso,
          vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et d&apos;opposition sur vos
          données personnelles. Vous pouvez exercer ces droits en nous contactant (coordonnées ci-dessus), ou en vous
          adressant à la Commission de l&apos;Informatique et des Libertés (CIL) du Burkina Faso.
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité">
        <p>
          Nous appliquons des mesures raisonnables pour protéger vos données : mots de passe chiffrés,
          rôles et permissions par utilisateur, historique des actions sensibles, confirmation avant certaines
          suppressions. Aucun système n&apos;étant infaillible, nous vous recommandons de choisir un mot de passe
          solide et de ne pas le partager.
        </p>
      </LegalSection>

      <LegalSection title="8. Stockage local et fonctionnement hors connexion">
        <p>
          Pour permettre l&apos;usage de la caisse sans connexion Internet, certaines données peuvent être stockées
          temporairement sur votre appareil (navigateur) puis synchronisées avec nos serveurs au retour de la
          connexion.
        </p>
      </LegalSection>

      <LegalSection title="9. Modifications de cette politique">
        <p>
          Cette politique peut être mise à jour ; la date de dernière mise à jour figure en haut de cette page. En
          cas de changement important, nous vous en informerons.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
