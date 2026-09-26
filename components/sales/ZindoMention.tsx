/** Ligne discrète en bas des tickets et factures (flag « mention_zindo_ticket », voir lib/zindo-mention.ts). */
export function ZindoMention({ className = "" }: { className?: string }) {
  return <p className={`text-center text-[10px] text-zinc-400 ${className}`}>Géré avec ZINDO · zindo.site</p>;
}
