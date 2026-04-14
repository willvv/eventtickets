"use client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelOrderButton({
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
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const cancelMutation = trpc.tickets.cancelOrder.useMutation({
    onSuccess: () => { setConfirming(false); setReason(""); router.refresh(); },
    onError: (e) => { setError(e.message); },
  });

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-800">
          {customerName ? `Cancelar orden de ${customerName}` : "Cancelar orden"}
        </p>
        <p className="text-xs text-red-600">Se cancelarán todas las entradas no escaneadas.</p>
        <input
          className="text-sm border rounded px-2 py-1"
          placeholder="Motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ orderId, orgId, reason: reason || undefined })}
          >
            {cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelación"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setConfirming(false); setError(""); }}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setConfirming(true)}>
      Cancelar
    </Button>
  );
}
