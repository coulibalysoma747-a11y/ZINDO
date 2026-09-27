import { requireSchoolAccess, getAccessibleClasses, getClassSubjects } from "@/lib/school-access";
import { getChaptersAction } from "@/lib/actions/school-teaching";

// Point-virgule : séparateur attendu par Excel en français.
function toRow(values: (string | number | null | undefined)[]) {
  return values.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";") + "\r\n";
}

/** Programme d'une matière (chapitres et leçons) en fichier CSV ouvrable dans Excel. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  const cls = classes.find((c) => c.id === url.searchParams.get("classe"));
  const subject = cls ? (await getClassSubjects(access, cls.id)).find((s) => s.subjectId === url.searchParams.get("matiere")) : undefined;
  if (!cls || !subject) return new Response("Classe ou matière introuvable", { status: 404 });
  const chapters = await getChaptersAction(cls.id, subject.subjectId);

  let csv = "﻿" + toRow(["Classe", "Matière", "N° chapitre", "Chapitre", "N° leçon", "Leçon", "Contenu", "Faite le"]);
  for (const c of chapters) {
    for (const l of c.lessons) {
      csv += toRow([cls.name, subject.name, c.position, c.title, l.position, l.title, l.content, l.doneAt ? new Date(l.doneAt).toLocaleDateString("fr-FR") : ""]);
    }
  }
  const file = `lecons-${cls.name}-${subject.name}`.normalize("NFD").replace(/[^\w-]+/g, "-");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}.csv"`,
    },
  });
}
