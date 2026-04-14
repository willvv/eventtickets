"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import QRCode from "qrcode";

const ORDER_STATUS_LABELS: Record<string, string> = {
  reserved: "Pendiente de pago",
  paid: "Pago recibido",
  issued: "Entradas emitidas",
  cancelled: "Cancelado",
};

const TICKET_STATE_LABELS: Record<string, string> = {
  reserved: "Reservado",
  issued: "Emitido",
  claimed: "Reclamado",
  scanned: "Escaneado",
  cancelled: "Cancelado",
};

function QrCanvas({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, data, { width: 200, margin: 2 });
    }
  }, [data]);
  return <canvas ref={canvasRef} className="mx-auto" />;
}

function formatCurrency(amount: number, currency: string) {
  if (currency === "CRC") return `₡${amount.toLocaleString("es-CR")}`;
  return `$${amount.toLocaleString("en-US")}`;
}

function sinpeSmsLink(phone: string, amount: number) {
  const cleaned = phone.replace(/\D/g, "");
  return `sms:${cleaned}?body=${encodeURIComponent(`PASE ${amount}`)}`;
}

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data, isLoading, error } = trpc.tickets.getOrderWithTickets.useQuery({ orderId });

  if (isLoading) return <div className="p-8 text-center">Cargando orden...</div>;
  if (error || !data) return <div className="p-8 text-center">Orden no encontrada.</div>;

  const { order, tickets, paymentMethod } = data as any;
  const event = order.eventId as any;
  const eventDate = event?.date ? new Date(event.date) : null;
  const isSinpe = paymentMethod?.type === "mobile-payment" && paymentMethod?.accountDetails;
  const isPending = order.status === "reserved" || order.status === "paid";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link href="/events" className="text-blue-600 hover:underline">← Eventos</Link>
        <span className="font-semibold text-lg">Mi Reserva</span>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Order summary */}
        <div className="bg-white rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-lg">{event?.title ?? "Evento"}</p>
              {eventDate && (
                <p className="text-sm text-gray-500">
                  {eventDate.toLocaleDateString("es-CR", { dateStyle: "medium" })} a las{" "}
                  {eventDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {event?.locationName && <p className="text-sm text-gray-500">{event.locationName}</p>}
            </div>
            <Badge variant={order.status === "issued" ? "default" : order.status === "cancelled" ? "destructive" : "outline"}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
          <div className="text-sm space-y-0.5 pt-1 border-t mt-2">
            <p><span className="text-gray-500">A nombre de:</span> {order.customerName}</p>
            <p><span className="text-gray-500">Teléfono:</span> {order.customerPhone}</p>
            <p><span className="text-gray-500">Total:</span> {formatCurrency(order.totalAmount, order.currency)}</p>
          </div>
        </div>

        {/* SINPE payment helper */}
        {isSinpe && isPending && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <p className="font-medium text-green-800">Instrucciones de pago — SINPE Móvil</p>
            <p className="text-sm text-green-700">
              Envíe <strong>{formatCurrency(order.totalAmount, order.currency)}</strong> por SINPE Móvil al número:
            </p>
            <p className="text-xl font-bold text-green-900">{paymentMethod.accountDetails}</p>
            <p className="text-sm text-green-700">
              Mensaje SMS: <code className="bg-green-100 px-1 rounded font-mono">PASE {order.totalAmount}</code>
            </p>
            <div className="flex gap-2 flex-wrap pt-1">
              <a
                href={sinpeSmsLink(paymentMethod.accountDetails, order.totalAmount)}
                className="inline-flex items-center rounded-md bg-green-600 text-white px-3 py-2 text-sm font-medium hover:bg-green-700"
              >
                Abrir SMS para pagar
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`PASE ${order.totalAmount}`);
                  alert(`Copiado: "PASE ${order.totalAmount}"\nEnvíe al ${paymentMethod.accountDetails}`);
                }}
                className="inline-flex items-center rounded-md border border-green-600 text-green-700 px-3 py-2 text-sm font-medium hover:bg-green-50"
              >
                Copiar mensaje
              </button>
            </div>
            {paymentMethod.instructions && (
              <p className="text-xs text-green-600 pt-1">{paymentMethod.instructions}</p>
            )}
          </div>
        )}

        {isPending && !isSinpe && paymentMethod && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="font-medium text-amber-800">Instrucciones de pago</p>
            <p className="text-sm text-amber-700 mt-1">{paymentMethod.instructions ?? "Contacte al organizador para completar el pago."}</p>
            {paymentMethod.accountDetails && (
              <p className="text-sm text-amber-700 mt-1">{paymentMethod.accountDetails}</p>
            )}
          </div>
        )}

        {isPending && (
          <p className="text-sm text-gray-500 text-center">
            Sus entradas se emitirán una vez confirmado el pago. Guarde este enlace para acceder a sus entradas.
          </p>
        )}

        {/* Tickets */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Entradas ({tickets.length})</h2>
          {tickets.map((ticket: any) => (
            <div key={ticket._id.toString()} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-2 border-b">
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">{ticket.sectionName}</p>
                  {ticket.seatLabel && <p className="text-gray-500">{ticket.seatLabel}</p>}
                  <p className="text-gray-500">{formatCurrency(ticket.price, ticket.currency)}</p>
                </div>
                <Badge variant={ticket.state === "issued" || ticket.state === "claimed" ? "default" : "outline"}>
                  {TICKET_STATE_LABELS[ticket.state] ?? ticket.state}
                </Badge>
              </div>

              {ticket.qrHmac && (
                <div className="p-4 bg-gray-50 text-center">
                  <p className="text-xs text-gray-500 mb-2">Código QR — presente en la entrada</p>
                  <QrCanvas data={ticket.qrHmac} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
