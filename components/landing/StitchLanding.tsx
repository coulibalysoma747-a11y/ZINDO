export function StitchLanding() {
  return (
    <>
      <iframe
        src="/landing-stitch.html"
        title="ZINDO — Système d'Encaissement & Gestion Commerciale"
        className="hidden md:block w-full border-0"
        style={{ height: "100vh" }}
      />
      <iframe
        src="/landing-stitch-mobile.html"
        title="ZINDO — Logiciel de Caisse & Gestion Commerciale"
        className="block md:hidden w-full border-0"
        style={{ height: "100vh" }}
      />
    </>
  );
}
