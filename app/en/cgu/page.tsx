import { getTrialDays } from "@/lib/platform-config";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

// Durée de l'essai réglable depuis la console admin (qui revalide aussi
// cette page à l'enregistrement) : relecture au plus toutes les heures.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/en/cgu" },
};

const UPDATED_AT = "September 16, 2026";

export default async function EnglishCguPage() {
  const trialDays = await getTrialDays();
  return (
    <LegalPage title="Terms of Service" updatedAt={UPDATED_AT} updatedAtLabel="Last updated" homeHref="/en" homeLabel="Home">
      <LegalSection title="1. Purpose">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of the ZINDO application, published
          by Coulibaly Soma, for stock, checkout, and sales management by businesses (shops, hardware stores,
          spare parts dealers, motorcycle shops, grocers, wholesalers...) across West Africa (Burkina Faso, Côte
          d&apos;Ivoire, Mali, Niger, Senegal, and other countries in the region). By creating an account, you accept
          these Terms without reservation.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of the service">
        <p>
          ZINDO lets you record products, track stock in real time, make sales and take payments, manage
          customers, suppliers and purchases, print or share receipts/invoices, and view reports. Some features
          may be rolled out progressively or reserved for a paid tier.
        </p>
      </LegalSection>

      <LegalSection title="3. Account and user responsibility">
        <p>
          You are responsible for the accuracy of the information provided when creating your account (name,
          phone, email, business details) and for keeping your password confidential. Any action taken from your
          account, including by an employee you granted access to, is deemed to be taken under your
          responsibility.
        </p>
        <p>
          You are solely responsible for the accuracy of the data you enter into ZINDO (products, prices, stock,
          customers, sales) and for the legal and tax obligations related to running your business.
        </p>
      </LegalSection>

      <LegalSection title="4. Pricing">
        <p>
          ZINDO offers a {trialDays}-day free trial, no commitment, when you create your account. After this period, using
          ZINDO requires a paid subscription: 10,000 FCFA per month or 100,000 FCFA per year. Payment is made via
          Mobile Money (Orange Money, Moov Money, Wave); the transaction reference must be entered on the
          &ldquo;Subscription&rdquo; page for confirmation. Any substantial change to pricing would be communicated to you
          before it applies to your account.
        </p>
      </LegalSection>

      <LegalSection title="5. Availability and offline use">
        <p>
          Some essential functions (viewing products, making a sale at checkout, local history) may keep working
          without an internet connection and sync once the connection returns. Outside of that mode, ZINDO remains
          an online service whose continuous availability isn&apos;t guaranteed (maintenance, technical incident,
          a third-party provider being unavailable).
        </p>
      </LegalSection>

      <LegalSection title="6. Ownership of the data you enter">
        <p>
          The data you enter into ZINDO (product catalog, sales, customers, suppliers...) belongs to you. You can
          request its export or deletion as described in our{" "}
          <Link href="/en/confidentialite" className="font-medium text-zindo-green-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may stop using ZINDO at any time. We may suspend or terminate an account in case of abusive or
          fraudulent use, or non-compliance with these Terms, after attempting to inform you beforehand whenever
          reasonably possible.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of liability">
        <p>
          ZINDO is provided &quot;as is&quot;. To the extent permitted by applicable law, the publisher cannot be
          held liable for indirect losses (loss of profits, of customers, or of data resulting from misuse) related
          to using the service. Nothing in these Terms limits any liability that cannot be legally excluded.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing law">
        <p>
          These Terms are governed by the law of Burkina Faso, regardless of the West African country you use ZINDO
          from. Any dispute, failing an amicable resolution, falls under the competent courts of Burkina Faso.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          For any question about these Terms, contact us via WhatsApp:{" "}
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
