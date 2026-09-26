"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ExpenseFormModal, type EditableExpense } from "./ExpenseFormModal";

export function EditExpenseButton({ expense, categories }: { expense: EditableExpense; categories: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800"
        aria-label="Modifier la dépense"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open && <ExpenseFormModal open onClose={() => setOpen(false)} categories={categories} expense={expense} />}
    </>
  );
}
