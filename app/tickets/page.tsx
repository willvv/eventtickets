"use client";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import QRCode from "qrcode";

const STATE_LABELS: Record<string, string> = {
  available: "Disponible",
  reserved: "Reservado",
  issued: "Emitido",
  claimed: "Reclamado",
  scanned: "Escaneado",
  cancelled: "Cancelado",
  released: "Liberado",
};

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  available: "secondary",
  reserved: "outline",
  issued: "default",
  claimed: "default",
  scanned: "secondary",
  cancelled: "destructive",
  released: "destructive",
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

export default function TicketsPage() {
  const { data: tickets, isLoading } = trpc.tickets.listByUser.useQuery();

  if (isLoading) return <div className="p-8 text-center">Cargando entradas...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link href="/events" className="text-blue-600 hover:underline">← Eventos</Link>
        <span className="font-semibold text-lg">Mis Entradas</span>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {!tickets || tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No tienes entradas aún.</p>
            <Link href="/events" className="text-blue-600 hover:underline">Ver eventos disponibles</Link>
          </div>
        ) : (
          tickets.map((ticket: any) => {
            const event = ticket.eventId as any;
            const eventDate = event?.date ? new Date(event.date) : null;
            const orderId = ticket.orderId?.toString();

            return (
              <div key={ticket._id.toString()} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/orders/${orderId}`} className="font-semibold text-lg hover:underline text-blue-700">
                      {event?.title ?? "Evento"}
                    </Link>
                    {eventDate && (
                      <p className="text-sm text-gray-500">
                        {eventDate.toLocaleDateString("es-CR", { dateStyle: "medium" })}
                        {" "}a las{" "}
                        {eventDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {event?.locationName && (
                      <p className="text-sm text-gray-500">{event.locationName}</p>
                    )}
                  </div>
                  <Badge variant={STATE_VARIANT[ticket.state] ?? "secondary"}>
                    {STATE_LABELS[ticket.state] ?? ticket.state}
                  </Badge>
                </div>

                <div className="p-4 space-y-1 text-sm">
                  <p><span className="text-gray-500">Sección:</span> {ticket.sectionName}</p>
                  {ticket.seatLabel && (
                    <p><span className="text-gray-500">Asiento:</span> {ticket.seatLabel}</p>
                  )}
                  {ticket.attendeeName && (
                    <p><span className="text-gray-500">Asistente:</span> {ticket.attendeeName}</p>
                  )}
                  <p><span className="text-gray-500">Precio:</span> {formatCurrency(ticket.price, ticket.currency)}</p>
                </div>

                {ticket.qrHmac && (
                  <div className="p-4 border-t bg-gray-50 text-center">
                    <p className="text-xs text-gray-500 mb-2">Código QR de entrada</p>
                    <QrCanvas data={ticket.qrHmac} />
                    <p className="text-xs text-gray-400 mt-2">Presente este código en la entrada</p>
                  </div>
                )}

                {ticket.state === "reserved" && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                      Tu reserva está pendiente de confirmación de pago por el organizador.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
