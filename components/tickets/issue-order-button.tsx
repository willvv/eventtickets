"use client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssueOrderButton({
  orderId,
  orgId,
  customerName,
  customerPhone,
  eventTitle,
}: {
  orderId: string;
  orgId: string;
  customerName?: string;
  customerPhone?: string;
  eventTitle?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [issued, setIssued] = useState(false);
  const [error, setError] = useState("");

  const issueMutation = trpc.tickets.issue.useMutation({
    onSuccess: () => {
      setConfirming(false);
      setIssued(true);
      router.refresh();
    },
    onError: (e) => { setError(e.message); setConfirming(false); },
  });

  const orderUrl = typeof window !== "undefined"
    ? `${window.location.origin}/orders/${orderId}`
    : `/orders/${orderId}`;

  const waMessage = encodeURIComponent(
    `Hola${customerName ? ` ${customerName}` : ""}! 🎟️ Sus entradas${eventTitle ? ` para *${eventTitle}*` : ""} están listas.\n\nVer aquí: ${orderUrl}`
  );
  const waPhone = customerPhone?.replace(/\D/g, "");
  const waLink = waPhone
    ? `https://wa.me/${waPhone.startsWith("506") ? waPhone : `506${waPhone}`}?text=${waMessage}`
    : `https://wa.me/?text=${waMessage}`;

  if (issued) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-green-600 font-medium">✓ Emitido</span>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          WhatsApp
        </a>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-amber-700 font-medium whitespace-nowrap">
          {customerName ? `¿Emitir para ${customerName}?` : "¿Confirmar emisión?"}
        </span>
        <Button
          size="sm"
          disabled={issueMutation.isPending}
          onClick={() => issueMutation.mutate({ orderId, orgId })}
          style={{ backgroundColor: "#00CDB9", color: "white" }}
        >
          {issueMutation.isPending ? "Emitiendo..." : "Sí, emitir"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          No
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <Button
      size="sm"
      style={{ backgroundColor: "#00CDB9", color: "white" }}
      onClick={() => setConfirming(true)}
    >
      Emitir
    </Button>
  );
}
