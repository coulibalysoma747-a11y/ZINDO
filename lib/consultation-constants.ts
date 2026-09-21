export const SEX_OPTIONS = ["M", "F"] as const;
export const AGE_GROUP_OPTIONS = ["ENFANT", "ADULTE", "SENIOR"] as const;
export const AGE_GROUP_LABELS: Record<(typeof AGE_GROUP_OPTIONS)[number], string> = {
  ENFANT: "Enfant",
  ADULTE: "Adulte",
  SENIOR: "Senior",
};
