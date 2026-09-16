import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  alternates: { canonical: "/cgu" },
};

const UPDATED_AT = "16 septembre 2026";

export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions générales d&apos;utilisation (« CGU ») régissent l&apos;accès et l&apos;utilisation de
          l&apos;application ZINDO, éditée par Coulibaly Soma, destinée à la gestion de stock, de caisse et de ventes
          des commerces (boutiques, quincailleries, pièces détachées, motos, alimentation, grossistes...) au Burkina
          Faso. En créant un compte, vous acceptez sans réserve les présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          ZINDO permet notamment d&apos;enregistrer des produits, de suivre un stock en temps réel, d&apos;effectuer des
          ventes et d&apos;encaisser, de gérer des clients, fournisseurs et achats, d&apos;imprimer ou partager des
          tickets/factures, et de consulter des rapports. Certaines fonctionnalités peuvent être activées
          progressivement ou réservées à une formule payante.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte et responsabilité de l'utilisateur">
        <p>
          Vous êtes responsable de l&apos;exactitude des informations fournies à la création de votre compte
          (nom, téléphone, e-mail, informations du commerce) et de la confidentialité de votre mot de passe. Toute
          action effectuée depuis votre compte, y compris par un employé auquel vous avez donné accès, est réputée
          effectuée sous votre responsabilité.
        </p>
        <p>
          Vous êtes seul responsable de l&apos;exactitude des données que vous saisissez dans ZINDO (produits, prix,
          stock, clients, ventes) et des obligations légales et fiscales liées à l&apos;exploitation de votre commerce.
        </p>
      </LegalSection>

      <LegalSection title="4. Abonnement et tarifs">
        <p>
          ZINDO propose une formule gratuite avec des limites (nombre de produits, de ventes, d&apos;utilisateurs...)
          ainsi que des formules payantes détaillées sur la page{" "}
          <Link href="/abonnement" className="font-medium text-zindo-green-600 hover:underline">
            Abonnement
          </Link>
          . Les tarifs peuvent évoluer ; toute modification substantielle vous sera communiquée avant application à
          votre compte.
        </p>
      </LegalSection>

      <LegalSection title="5. Disponibilité et fonctionnement hors connexion">
        <p>
          Certaines fonctions essentielles (consultation des produits, vente en caisse, historique local) peuvent
          continuer à fonctionner sans connexion Internet et se synchronisent au retour de la connexion. En dehors de
          ce mode, ZINDO reste néanmoins un service en ligne dont la disponibilité continue n&apos;est pas garantie
          (maintenance, incident technique, indisponibilité d&apos;un prestataire tiers).
        </p>
      </LegalSection>

      <LegalSection title="6. Propriété des données saisies">
        <p>
          Les données que vous saisissez dans ZINDO (catalogue produits, ventes, clients, fournisseurs...) vous
          appartiennent. Vous pouvez en demander l&apos;export ou la suppression selon les modalités décrites dans notre{" "}
          <Link href="/confidentialite" className="font-medium text-zindo-green-600 hover:underline">
            Politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Résiliation">
        <p>
          Vous pouvez cesser d&apos;utiliser ZINDO à tout moment. Nous pouvons suspendre ou résilier un compte en cas
          d&apos;usage abusif, frauduleux, ou de non-respect des présentes CGU, après tentative d&apos;information
          préalable lorsque cela est raisonnablement possible.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation de responsabilité">
        <p>
          ZINDO est fourni « en l&apos;état ». Dans la mesure permise par la loi applicable, l&apos;éditeur ne peut être
          tenu responsable des pertes indirectes (perte de bénéfices, de clientèle, de données résultant d&apos;une
          mauvaise utilisation) liées à l&apos;usage du service. Rien dans les présentes CGU ne limite une
          responsabilité qui ne peut être légalement exclue.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit burkinabè. Tout litige relève, à défaut de résolution amiable, des
          juridictions compétentes du Burkina Faso.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Pour toute question sur ces CGU, contactez-nous via WhatsApp :{" "}
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
    </LegalPage>
  );
}
