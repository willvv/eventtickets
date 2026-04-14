import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { Order } from "@/models/Order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketStateBadge } from "@/components/tickets/ticket-state-badge";
import { TicketState } from "@/types/ticket";
import { formatDateCR, formatCurrency } from "@/lib/utils/date-format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IssueOrderButton } from "@/components/tickets/issue-order-button";
export const dynamic = "force-dynamic";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  reserved: "Reservado",
  paid: "Pagado",
  issued: "Emitido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  "bank-transfer": "Transferencia",
  "mobile-payment": "SINPE Móvil",
  other: "Otro",
};

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function TicketsPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  await connectDB();
  const org = await Organization.findOne({ slug: orgSlug });
  if (!org) redirect("/");

  const event = await Event.findOne({ _id: eventId, orgId: org._id });
  if (!event) redirect(`/org/${orgSlug}/events`);

  const [tickets, orders] = await Promise.all([
    Ticket.find({ eventId: event._id, orgId: org._id }).sort({ createdAt: -1 }).limit(100),
    Order.find({ eventId: event._id, orgId: org._id }).sort({ createdAt: -1 }).limit(100),
  ]);

  const stateCounts = tickets.reduce((acc, t) => {
    acc[t.state] = (acc[t.state] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Entradas — {event.title}</h1>
          </div>
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/events/${eventId}`}>← Volver</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Summary */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(stateCounts).map(([state, count]) => (
            <Card key={state} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <TicketStateBadge state={state as TicketState} />
                <span className="font-bold">{count}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Orders table */}
        {orders.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Órdenes ({orders.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cliente</th>
                    <th className="text-left py-2 pr-4">Pago</th>
                    <th className="text-left py-2 pr-4">Estado</th>
                    <th className="text-right py-2 pr-4">Total</th>
                    <th className="text-right py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id.toString()} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{order.customerName ?? "—"}</div>
                        {order.customerEmail && <div className="text-xs text-muted-foreground">{order.customerEmail}</div>}
                        {order.customerPhone && <div className="text-xs text-muted-foreground">{order.customerPhone}</div>}
                      </td>
                      <td className="py-2 pr-4">
                        <div>{PAYMENT_TYPE_LABELS[order.paymentMethodType] ?? order.paymentMethodType}</div>
                        {order.paymentNotes && <div className="text-xs text-muted-foreground">{order.paymentNotes}</div>}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={order.status === "issued" ? "default" : order.status === "reserved" ? "outline" : "secondary"}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right pr-4">{formatCurrency(order.totalAmount, order.currency)}</td>
                      <td className="py-2 text-right">
                        {(order.status === "reserved" || order.status === "paid") && (
                          <IssueOrderButton orderId={order._id.toString()} orgId={org._id.toString()} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Ticket table */}
        <Card>
          <CardHeader><CardTitle>Lista de Entradas ({tickets.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Sección / Asiento</th>
                  <th className="text-left py-2 pr-4">Asistente</th>
                  <th className="text-left py-2 pr-4">Estado</th>
                  <th className="text-right py-2">Precio</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket._id.toString()} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{ticket.sectionName}</div>
                      {ticket.seatLabel && <div className="text-xs text-muted-foreground">{ticket.seatLabel}</div>}
                    </td>
                    <td className="py-2 pr-4">{ticket.attendeeName ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <TicketStateBadge state={ticket.state as TicketState} />
                    </td>
                    <td className="py-2 text-right">{formatCurrency(ticket.price, ticket.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
