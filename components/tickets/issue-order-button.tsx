"use client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssueOrderButton({
  orderId,
  orgId,
  customerName,
}: {
  orderId: string;
  orgId: string;
  customerName?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const issueMutation = trpc.tickets.issue.useMutation({
    onSuccess: () => { setConfirming(false); router.refresh(); },
    onError: (e) => { setError(e.message); setConfirming(false); },
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-700 font-medium whitespace-nowrap">
          {customerName ? `¿Emitir para ${customerName}?` : "¿Confirmar emisión?"}
        </span>
        <Button
          size="sm"
          variant="destructive"
          disabled={issueMutation.isPending}
          onClick={() => issueMutation.mutate({ orderId, orgId })}
        >
          {issueMutation.isPending ? "Emitiendo..." : "Sí, emitir"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        style={{ backgroundColor: "#00CDB9", color: "white" }}
        onClick={() => setConfirming(true)}
      >
        Emitir
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
