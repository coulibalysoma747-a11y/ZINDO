/** Moyens de paiement de la scolarité — voir lib/actions/school.ts. */
export const SCHOOL_PAYMENT_METHODS = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile money",
  VIREMENT: "Virement / chèque",
  AUTRE: "Autre",
} as const;
export type SchoolPaymentMethod = keyof typeof SCHOOL_PAYMENT_METHODS;

/** Types de frais scolaires. La scolarité vient du montant annuel de la classe. */
export const SCHOOL_FEE_TYPES = {
  SCOLARITE: "Scolarité",
  INSCRIPTION: "Inscription",
  CANTINE: "Cantine",
  TRANSPORT: "Transport",
  UNIFORME: "Uniforme",
  ACTIVITES: "Activités",
  EXAMENS: "Examens",
  AUTRE: "Autre",
} as const;
export type SchoolFeeType = keyof typeof SCHOOL_FEE_TYPES;

export const ATTENDANCE_STATUSES = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  RETARD: "Retard",
  JUSTIFIE: "Absence justifiée",
} as const;
export type AttendanceStatus = keyof typeof ATTENDANCE_STATUSES;

export const EVALUATION_KINDS = {
  INTERROGATION: "Interrogation",
  DEVOIR: "Devoir",
  COMPOSITION: "Composition",
  EXAMEN: "Examen",
} as const;
export type EvaluationKind = keyof typeof EVALUATION_KINDS;

export const HOMEWORK_KINDS = {
  DEVOIR: "Devoir",
  EXERCICES: "Exercices",
  QUESTIONS: "Questions",
} as const;
export type HomeworkKind = keyof typeof HOMEWORK_KINDS;

export const TERMS = [1, 2, 3] as const;
export function termLabel(term: number) {
  return term === 1 ? "1er trimestre" : `${term}e trimestre`;
}

export const WEEKDAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

/** Année scolaire en cours : elle commence en septembre (« 2026-2027 »). */
export function currentSchoolYear(date = new Date()) {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** Premier jour de l'année scolaire en cours (1er septembre), au format AAAA-MM-JJ. */
export function schoolYearStart(date = new Date()) {
  const y = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${y}-09-01`;
}

/** Appréciation automatique d'une moyenne sur 20. */
export function gradeAppreciation(avg: number | null) {
  if (avg === null) return "";
  if (avg < 5) return "Très insuffisant";
  if (avg < 8) return "Insuffisant";
  if (avg < 10) return "Médiocre";
  if (avg < 12) return "Passable";
  if (avg < 14) return "Assez bien";
  if (avg < 16) return "Bien";
  if (avg < 18) return "Très bien";
  return "Excellent";
}

export function formatAverage(avg: number | null) {
  return avg === null ? "—" : avg.toFixed(2).replace(".", ",");
}
