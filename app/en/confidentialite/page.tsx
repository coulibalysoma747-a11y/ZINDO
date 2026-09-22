import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/en/confidentialite" },
};

const UPDATED_AT = "September 16, 2026";

export default function EnglishConfidentialitePage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt={UPDATED_AT}
      updatedAtLabel="Last updated"
      homeHref="/en"
      homeLabel="Home"
    >
      <LegalSection title="1. Data controller">
        <p>
          ZINDO is published by Coulibaly Soma. For any question about your personal data, contact us via
          WhatsApp:{" "}
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

      <LegalSection title="2. Data we collect">
        <p>
          When you create your account: first name, last name, phone number, email (optional), password (stored
          encrypted), your business&apos;s name and type, and city.
        </p>
        <p>
          When using the service: the data you enter yourself (products, sales, customers, suppliers, purchases)
          as well as technical data (action history, connection log) needed for the security and operation of the
          service.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we use this data">
        <ul className="list-disc space-y-1 pl-5">
          <li>To run your account and the ZINDO service (checkout, stock, reports...);</li>
          <li>To contact you about your account or subscription;</li>
          <li>To keep the service secure (roles, permissions, action history, fraud prevention);</li>
          <li>To improve the service (aggregated usage statistics);</li>
          <li>To meet our legal obligations.</li>
        </ul>
        <p>We do not sell your personal data to third parties.</p>
      </LegalSection>

      <LegalSection title="4. Sharing your data">
        <p>
          Your data is hosted with our technical providers (hosting, database, email delivery) only to the extent
          necessary to run ZINDO. If you enable an optional third-party integration yourself (e.g. FasoStock
          sync), the corresponding data is exchanged with that service according to the settings you configure.
        </p>
      </LegalSection>

      <LegalSection title="5. Data retention">
        <p>
          Your data is kept for as long as your account is in use, then for as long as needed to comply with our
          legal obligations (accounting in particular), before deletion or anonymization.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights">
        <p>
          Under Burkina Faso&apos;s law n° 001-2021/AN on the protection of personal data — the country where ZINDO
          is domiciled — you have a right of access, rectification, deletion, and objection regarding your personal
          data. You can exercise these rights by contacting us (details above), or by reaching out to Burkina
          Faso&apos;s Commission de l&apos;Informatique et des Libertés (CIL). If you use ZINDO from another West
          African country, you may also have additional rights under your own country&apos;s data protection law —
          contact us first and we will forward your request to the relevant authority if needed.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We apply reasonable measures to protect your data: encrypted passwords, per-user roles and permissions,
          a history of sensitive actions, and confirmation before certain deletions. No system is foolproof, so we
          recommend choosing a strong password and never sharing it.
        </p>
      </LegalSection>

      <LegalSection title="8. Local storage and offline use">
        <p>
          To allow the checkout screen to work without an internet connection, some data may be temporarily stored
          on your device (browser) and then synced with our servers once the connection returns.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p>
          This policy may be updated; the last-updated date appears at the top of this page. We will inform you of
          any significant change.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
