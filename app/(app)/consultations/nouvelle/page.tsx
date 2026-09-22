import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isConsultationsModuleEnabled } from "@/lib/actions/consultations";
import { getMedicalActsAction } from "@/lib/actions/medical-acts";
import { getDiagnosisCategoriesAction } from "@/lib/actions/diagnosis-categories";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";
import { Card, CardBody } from "@/components/ui/Card";
import { ConsultationForm } from "../ConsultationForm";

export default async function NouvelleConsultationPage() {
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");
  if (!(await isConsultationsModuleEnabled(user.businessId))) redirect("/dashboard");

  const [medicalActs, diagnosisCategories] = await Promise.all([getMedicalActsAction(), getDiagnosisCategoriesAction()]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvelle consultation</h1>
        <p className="text-sm text-zinc-500">
          Le nom et l&apos;âge du patient sont facultatifs — laissez-les vides pour garder un registre anonyme.
        </p>
      </div>
      <Card>
        <CardBody>
          <ConsultationForm medicalActs={medicalActs} diagnosisCategories={diagnosisCategories} />
        </CardBody>
      </Card>
    </div>
  );
}
