import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardBody } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zindo-green-600 text-sm font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <div className="space-y-3 text-sm leading-relaxed text-zinc-700">{children}</div>
      </div>
    </section>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white text-sm">
      {rows.map(([a, b]) => (
        <div key={a} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <span className="text-zinc-600">{a}</span>
          <span className="shrink-0 font-semibold tabular-nums text-zinc-900">{b}</span>
        </div>
      ))}
    </div>
  );
}

/** Guide du module Prix de revient : un exemple chiffré du début à la fin (chiffres vérifiés par lib/landed-cost.ts). */
export default async function CostPriceGuidePage() {
  await requirePermission(PERMISSIONS.COST_PRICE_MANAGE);
  return (
    <div className="max-w-3xl space-y-8">
      <Link href="/prix-de-revient" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux arrivages
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Comment ça marche ?</h1>
        <p className="mt-1 text-sm text-zinc-500">Un seul exemple, suivi du début à la fin : un conteneur reçu d&apos;Abidjan.</p>
      </div>

      <Step n={1} title="Pourquoi la facture du fournisseur ne suffit pas">
        <p>
          Vous achetez un sac de riz 12 000 F. Il faut encore payer le camion, la douane et les porteurs. Au final, ce sac ne vous a pas coûté 12 000 F. Si vous
          fixez votre prix sur le chiffre de la facture, vous pouvez vendre à perte sans le voir.
        </p>
        <p>Ce module répartit ces frais sur chaque article de l&apos;arrivage, calcule le vrai prix de revient et vous propose un prix de vente.</p>
      </Step>

      <Step n={2} title="Notre exemple">
        <Rows
          rows={[
            ["80 sacs de riz de 25 kg à 12 000 F", "960 000 F"],
            ["40 cartons de savon de 12 kg à 9 000 F", "360 000 F"],
            ["Marchandise", "1 320 000 F"],
            ["Camion Abidjan–Ouagadougou", "150 000 F"],
            ["Douane", "132 000 F"],
            ["Déchargement", "30 000 F"],
            ["Total sorti de votre poche", "1 632 000 F"],
          ]}
        />
        <p>Vous avez payé 1 632 000 F, pas 1 320 000 F. Reste à savoir quelle part des 312 000 F de frais revient au riz et laquelle au savon.</p>
      </Step>

      <Step n={3} title="Chaque frais choisit sa règle de partage">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>À la valeur</b> : l&apos;article cher porte plus. Pour la douane, les taxes, l&apos;assurance.</li>
          <li><b>Au poids</b> : le lourd porte plus. Pour le camion. Vous saisissez le poids d&apos;une unité sur sa ligne.</li>
          <li><b>À la quantité</b> : chaque unité porte la même part. Pour le déchargement par exemple.</li>
          <li><b>Au volume</b> : l&apos;encombrant porte plus. Pour un conteneur payé au mètre cube.</li>
          <li><b>À la main</b> : vous fixez vous-même la part de chaque ligne.</li>
        </ul>
        <Rows
          rows={[
            ["Camion au poids : riz (2 000 kg sur 2 480)", "120 968 F"],
            ["Camion au poids : savon (480 kg sur 2 480)", "29 032 F"],
            ["Douane à la valeur : riz (960 000 sur 1 320 000)", "96 000 F"],
            ["Douane à la valeur : savon", "36 000 F"],
            ["Déchargement à la quantité : riz (80 sur 120)", "20 000 F"],
            ["Déchargement à la quantité : savon", "10 000 F"],
          ]}
        />
        <p>
          Le total des parts est toujours exactement égal au total de vos frais : pas un franc de perdu. Si vous demandez un partage au poids sans avoir saisi les
          poids, l&apos;application partage à la quantité plutôt que de donner un résultat faux, et vous le signale.
        </p>
      </Step>

      <Step n={4} title="Le vrai prix de revient">
        <Rows
          rows={[
            ["Riz : 960 000 + 236 968 = 1 196 968 F pour 80 sacs", "14 962 F le sac"],
            ["Savon : 360 000 + 75 032 = 435 032 F pour 40 cartons", "10 876 F le carton"],
          ]}
        />
        <p>
          Le sac facturé 12 000 F vous revient à 14 962 F. Vendu 13 500 F, vous croyez gagner 1 500 F : vous perdez 1 462 F par sac.
        </p>
      </Step>

      <Step n={5} title="Votre marge : quatre façons de la dire">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Ajouter un %</b> : coût × (1 + %). Avec 20 %, le sac de riz passe à 17 955 F.</li>
          <li><b>Garder un % sur la vente</b> : coût ÷ (1 − %). Avec 20 %, on obtient 18 703 F : il vous reste bien 20 % du prix de vente.</li>
          <li><b>Ajouter un montant</b> : coût + 2 000 F, quand votre marge est fixe par article.</li>
          <li><b>Prix imposé</b> : vous fixez le prix, l&apos;application vous dit ce qu&apos;il vous reste.</li>
        </ul>
        <p>
          « 20 % » ne veut pas dire la même chose selon la façon de compter : ajouter 20 % au coût laisse seulement 16,7 % du prix de vente. Choisissez la façon qui
          correspond à votre raisonnement.
        </p>
        <p>
          <b>Arrondi</b> : un prix conseillé à 17 955 F oblige à rendre la monnaie. Avec un arrondi à 25 F, il devient 17 950 F.
        </p>
      </Step>

      <Step n={6} title="L'ancien stock ne doit pas fausser la marge">
        <p>
          Il vous reste souvent des articles payés moins cher lors de la commande précédente. Si l&apos;application remplaçait simplement l&apos;ancien prix d&apos;achat, votre
          marge serait fausse sur tout ce qui reste en rayon. Vous choisissez :
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Moyenne avec l&apos;ancien stock</b> (recommandé) : l&apos;ancien et le nouveau sont mélangés au prorata des quantités. Quel que soit le sac vendu, la marge affichée est juste.</li>
          <li><b>Coût de cet arrivage seulement</b> : plus simple à suivre, mais la marge est sous-estimée sur les anciens articles tant qu&apos;ils ne sont pas écoulés.</li>
        </ul>
      </Step>

      <Step n={7} title="Prix seulement, ou prix et stock ?">
        <p>C&apos;est le réglage le plus important :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Prix seulement</b> : la marchandise a déjà été enregistrée (module Achats, inventaire). Seuls les prix changent.</li>
          <li><b>Prix et entrée en stock</b> : vous n&apos;avez rien saisi ailleurs. À l&apos;application, la marchandise entre en stock.</li>
        </ul>
        <p>
          Si l&apos;arrivage correspond à un achat déjà saisi, utilisez « Reprendre un achat » : les lignes sont recopiées et l&apos;arrivage passe en « prix seulement ».
          La marchandise ne peut pas être comptée deux fois.
        </p>
      </Step>

      <Step n={8} title="Rien ne bouge avant « Appliquer »">
        <p>
          Un brouillon est une simulation : ni le stock ni les prix ne sont touchés. Vous pouvez essayer une marge, changer une règle, ajouter un frais oublié, autant de
          fois que vous voulez.
        </p>
        <p>
          Avant d&apos;appliquer, l&apos;application signale les lignes à regarder : vente à perte, marge nulle, hausse de prix de plus de 15 %. Une fois appliqué, l&apos;arrivage
          est verrouillé et chaque changement de prix est gardé dans l&apos;historique.
        </p>
        <p>
          <b>Retour arrière</b> : « Remettre les anciens prix » restaure les prix d&apos;avant, sans jamais toucher au stock (la marchandise est bien arrivée). Les
          articles dont le prix a changé depuis, par un autre arrivage ou à la main, sont laissés tranquilles.
        </p>
      </Step>

      <Card>
        <CardBody className="space-y-2 text-sm text-zinc-700">
          <p className="font-semibold text-zinc-900">Questions fréquentes</p>
          <p><b>J&apos;achète en cedis ou en dollars.</b> Dans « Réglages avancés » de l&apos;arrivage, indiquez la devise et la valeur d&apos;une unité en monnaie du commerce. Saisissez tout dans cette devise : l&apos;application convertit.</p>
          <p><b>Je ne veux pas changer le prix de vente d&apos;un article.</b> Décochez « Appliquer » sur sa ligne : son prix d&apos;achat est mis à jour, son prix de vente reste celui d&apos;avant.</p>
          <p><b>Un frais arrive après coup.</b> Si l&apos;arrivage n&apos;est pas encore appliqué, ajoutez-le. S&apos;il l&apos;est déjà, créez un nouvel arrivage en « prix seulement » avec les mêmes articles et ce seul frais (bouton « Copier »).</p>
          <p><b>Qui peut utiliser cette page ?</b> Le propriétaire, ou un employé à qui vous accordez le droit « Gérer le prix de revient ».</p>
        </CardBody>
      </Card>

      <ButtonLink href="/prix-de-revient/nouveau">Créer mon premier arrivage</ButtonLink>
    </div>
  );
}
