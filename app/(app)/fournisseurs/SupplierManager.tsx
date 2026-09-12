"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SupplierFormModal } from "./SupplierFormModal";

export function SupplierManager({ mode }: { mode: "create-only" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nouveau fournisseur
      </Button>
      <SupplierFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
