"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ClientFormModal } from "../ClientFormModal";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
};

export function ClientEditButton({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Modifier
      </Button>
      <ClientFormModal open={open} onClose={() => setOpen(false)} customer={customer} />
    </>
  );
}
