"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ClientFormModal } from "./ClientFormModal";

export function ClientManager() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nouveau client
      </Button>
      <ClientFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
