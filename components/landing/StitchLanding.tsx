import {
  LANDING_STITCH_DESKTOP_HTML,
  LANDING_STITCH_MOBILE_HTML,
} from "@/lib/landing-stitch-html";

export function StitchLanding() {
  return (
    <>
      <iframe
        srcDoc={LANDING_STITCH_DESKTOP_HTML}
        title="ZINDO — Système d'Encaissement & Gestion Commerciale"
        className="hidden md:block w-full border-0"
        style={{ height: "100vh" }}
      />
      <iframe
        srcDoc={LANDING_STITCH_MOBILE_HTML}
        title="ZINDO — Logiciel de Caisse & Gestion Commerciale"
        className="block md:hidden w-full border-0"
        style={{ height: "100vh" }}
      />
    </>
  );
}
