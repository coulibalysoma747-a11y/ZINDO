import {
  LANDING_STITCH_DESKTOP_HTML,
  LANDING_STITCH_MOBILE_HTML,
} from "@/lib/landing-stitch-html";

const INTERCEPT_SCRIPT = `<script>
(function(){
  function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function scroll(id){if(!id){window.scrollTo({top:0,behavior:'smooth'}); return true;} var el=document.getElementById(id); if(el){el.scrollIntoView({behavior:'smooth',block:'start'}); return true;} return false;}
  function goDemo(){return scroll('demonstration-video')||scroll('video-demo');}
  function goReviews(){return scroll('temoignages')||(function(){var el=document.querySelector('[data-purpose="mobile-testimonials"]'); if(el){el.scrollIntoView({behavior:'smooth',block:'start'}); return true;} return false;})(); }
  document.addEventListener('click',function(e){
    var a=e.target && e.target.closest && e.target.closest('a');
    if(!a) return;
    var href=a.getAttribute('href')||'';
    var decoded=href;
    try { decoded=decodeURIComponent(href); } catch(e) {}
    if(href.charAt(0)==='#'){
      e.preventDefault();
      e.stopPropagation();
      var id=href.slice(1);
      if(id==='demonstration-video' || id==='video-demo'){ goDemo(); return; }
      if(id==='temoignages'){ goReviews(); return; }
      scroll(id);
      return;
    }
    if(href.indexOf('wa.me')===-1 && decoded.indexOf('wa.me')===-1) return;
    var text=norm((a.innerText||a.textContent||a.getAttribute('aria-label')||'')+' '+decoded+' '+href);
    if(/dans ma boutique|activer|essai|forfait|abonnement|mensuel|annuel|pack|contact|chat/.test(text)) return;
    var isDemo=/demo|video|demonstration/.test(text);
    var isReview=/avis|temoign|cas de|cas d'|review|success/.test(text);
    if(isDemo){ e.preventDefault(); e.stopPropagation(); goDemo(); }
    else if(isReview){ e.preventDefault(); e.stopPropagation(); goReviews(); }
  },true);
})();
</script>`;

function inject(html: string): string {
  if (html.indexOf("</body>") !== -1) {
    return html.replace("</body>", INTERCEPT_SCRIPT + "</body>");
  }
  return html + INTERCEPT_SCRIPT;
}

export function StitchLanding() {
  return (
    <>
      <iframe
        srcDoc={inject(LANDING_STITCH_DESKTOP_HTML)}
        title="ZINDO — Système d'Encaissement & Gestion Commerciale"
        className="hidden md:block w-full border-0"
        style={{ height: "100vh" }}
      />
      <iframe
        srcDoc={inject(LANDING_STITCH_MOBILE_HTML)}
        title="ZINDO — Logiciel de Caisse & Gestion Commerciale"
        className="block md:hidden w-full border-0"
        style={{ height: "100vh" }}
      />
    </>
  );
}
