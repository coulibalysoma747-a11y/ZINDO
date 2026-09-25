"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SupplierFormModal } from "../SupplierFormModal";

type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  leadTimeDays?: number | null;
};

export function SupplierEditButton({ supplier, showLeadTime = false }: { supplier: Supplier; showLeadTime?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Modifier
      </Button>
      <SupplierFormModal open={open} onClose={() => setOpen(false)} supplier={supplier} showLeadTime={showLeadTime} />
    </>
  );
}
