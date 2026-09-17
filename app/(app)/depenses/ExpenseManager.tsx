"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExpenseFormModal } from "./ExpenseFormModal";

export function ExpenseManager({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nouvelle dépense
      </Button>
      <ExpenseFormModal open={open} onClose={() => setOpen(false)} categories={categories} />
    </>
  );
}
