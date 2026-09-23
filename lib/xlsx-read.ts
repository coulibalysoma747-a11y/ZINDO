import { unzipSync, strFromU8 } from "fflate";

/**
 * Lecture minimale de la première feuille d'un classeur .xlsx (valeurs
 * brutes, sans formules ni styles) — suffisant pour les exports tabulaires
 * d'autres logiciels (ex. FasoStock) sans dépendre d'une grosse bibliothèque
 * Excel. Retourne les lignes indexées à partir de 0 ; une ligne ou cellule
 * absente du fichier devient une chaîne vide.
 */
export function readFirstSheet(buffer: Uint8Array): string[][] {
  const files = unzipSync(buffer, {
    filter: (f) => f.name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name),
  });
  const sheetName = Object.keys(files)
    .filter((n) => n.startsWith("xl/worksheets/"))
    .sort((a, b) => sheetNumber(a) - sheetNumber(b))[0];
  if (!sheetName) throw new Error("Aucune feuille trouvée dans le fichier Excel");

  const shared = files["xl/sharedStrings.xml"]
    ? [...strFromU8(files["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]))
    : [];

  const rows: string[][] = [];
  const xml = strFromU8(files[sheetName]);
  for (const rowMatch of xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: string[] = [];
    for (const cell of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cell[1]);
      if (!ref) continue;
      const type = /\bt="(\w+)"/.exec(cell[1])?.[1];
      const body = cell[2] ?? "";
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let text = "";
      if (type === "s" && value !== undefined) text = shared[Number(value)] ?? "";
      else if (type === "inlineStr") text = textOf(body);
      else if (value !== undefined) text = decodeXml(value);
      row[columnIndex(ref[1])] = text;
    }
    rows[Number(rowMatch[1]) - 1] = Array.from(row, (c) => c ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}

function sheetNumber(name: string) {
  return Number(/sheet(\d+)\.xml$/.exec(name)?.[1] ?? 0);
}

function columnIndex(letters: string) {
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

function textOf(xml: string) {
  return decodeXml([...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
}

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}
