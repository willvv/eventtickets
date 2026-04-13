import { Badge } from "@/components/ui/badge";
import { TicketState } from "@/types/ticket";

const STATE_CONFIG: Record<TicketState, { label: string; variant: "success" | "warning" | "info" | "destructive" | "gray" | "secondary" }> = {
  [TicketState.AVAILABLE]: { label: "Disponible", variant: "success" },
  [TicketState.RESERVED]: { label: "Reservado", variant: "warning" },
  [TicketState.ISSUED]: { label: "Emitido", variant: "info" },
  [TicketState.CLAIMED]: { label: "Reclamado", variant: "secondary" },
  [TicketState.SCANNED]: { label: "Ingresado", variant: "gray" },
  [TicketState.CANCELLED]: { label: "Cancelado", variant: "destructive" },
  [TicketState.RELEASED]: { label: "Liberado", variant: "secondary" },
};

export function TicketStateBadge({ state }: { state: TicketState }) {
  const config = STATE_CONFIG[state];
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}
