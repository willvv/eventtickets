"use client";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: event, isLoading, error } = trpc.events.getPublicBySlug.useQuery({ slug });

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orderError, setOrderError] = useState("");

  const reserveMutation = trpc.tickets.reserve.useMutation({
    onSuccess: (data) => {
      router.push(`/orders/${(data.order as any)._id}`);
    },
    onError: (e) => {
      setOrderError(e.message);
    },
  });

  if (isLoading) return <div className="p-8 text-center">Cargando evento...</div>;
  if (error || !event) return <div className="p-8 text-center">Evento no encontrado.</div>;

  const org = event.orgId as any;
  const publicPaymentMethods = org?.paymentMethods?.filter(
    (m: any) => m.availableInPublicPortal && m.isActive
  ) ?? [];

  const section = event.sectionPrices?.find((s: any) => s.sectionId === selectedSection);
  const total = section ? section.price * qty : 0;
  const selectedPaymentMethod = publicPaymentMethods.find((m: any) => m.id === paymentMethod);

  function formatCurrency(amount: number, currency: string) {
    if (currency === "CRC") return `₡${amount.toLocaleString("es-CR")}`;
    return `$${amount.toLocaleString("en-US")}`;
  }

  function sinpeSmsLink(recipientPhone: string, amount: number) {
    const cleaned = recipientPhone.replace(/\D/g, "");
    const body = encodeURIComponent(`PASE ${amount}`);
    return `sms:${cleaned}?body=${body}`;
  }

  function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!section || !paymentMethod) return;
    setOrderError("");

    const seats = Array.from({ length: qty }, (_, i) => ({
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      seatLabel: `General ${i + 1}`,
      price: section.price,
      currency: section.currency,
    }));

    reserveMutation.mutate({
      eventId: (event as any)._id.toString(),
      orgId: (event as any).orgId._id?.toString() ?? (event as any).orgId.toString(),
      seats,
      paymentMethodId: paymentMethod,
      customerName,
      customerPhone: phone,
      paymentNotes: notes || undefined,
    });
  }

  const eventDate = new Date(event.date);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link href="/events" className="text-blue-600 hover:underline">← Eventos</Link>
        <span className="font-semibold text-lg">{event.title}</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Event info */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
          <p className="text-gray-600 mb-1">
            {eventDate.toLocaleDateString("es-CR", { dateStyle: "full" })} a las{" "}
            {eventDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-gray-600 mb-3">{event.locationName} — {event.locationAddress}</p>
          {event.description && <p className="text-gray-700">{event.description}</p>}
        </div>

        {/* Ticket purchase form */}
        <form onSubmit={handleReserve} className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Seleccionar Entradas</h2>

          {/* Section selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Zona / Sección</label>
            <div className="grid gap-2">
              {event.sectionPrices?.map((s: any) => (
                <button
                  key={s.sectionId}
                  type="button"
                  onClick={() => setSelectedSection(s.sectionId)}
                  className={`p-3 rounded border text-left transition-colors ${
                    selectedSection === s.sectionId
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <span className="font-medium">{s.sectionName}</span>
                  <span className="ml-2 text-blue-700">{formatCurrency(s.price, s.currency)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          {selectedSection && (
            <div>
              <label className="text-sm font-medium text-gray-700">Cantidad</label>
              <div className="flex items-center gap-3 mt-1">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border text-lg font-bold flex items-center justify-center hover:bg-gray-100">−</button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button type="button" onClick={() => setQty(q => Math.min(10, q + 1))}
                  className="w-8 h-8 rounded-full border text-lg font-bold flex items-center justify-center hover:bg-gray-100">+</button>
              </div>
            </div>
          )}

          {/* Payment method */}
          {selectedSection && publicPaymentMethods.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Método de Pago</label>
              {publicPaymentMethods.map((m: any) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`w-full p-3 rounded border text-left transition-colors ${
                    paymentMethod === m.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <p className="font-medium">{m.name}</p>
                  {m.instructions && <p className="text-sm text-gray-500">{m.instructions}</p>}
                  {m.accountDetails && <p className="text-sm text-gray-500">{m.accountDetails}</p>}
                </button>
              ))}
            </div>
          )}

          {/* Customer info + SINPE helper */}
          {paymentMethod && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre completo <span className="text-red-500">*</span></label>
                <input
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Teléfono <span className="text-red-500">*</span></label>
                <input
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="8888-0000"
                  className="mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notas de pago</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Confirmación de transferencia..."
                  className="mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {/* SINPE Móvil helper */}
              {selectedPaymentMethod?.type === "mobile-payment" && selectedPaymentMethod?.accountDetails && section && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                  <p className="text-sm font-medium text-green-800">Pago por SINPE Móvil</p>
                  <p className="text-sm text-green-700">
                    Número: <strong>{selectedPaymentMethod.accountDetails}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Monto: <strong>{formatCurrency(total, section.currency)}</strong>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={sinpeSmsLink(selectedPaymentMethod.accountDetails, total)}
                      className="inline-flex items-center gap-1 rounded-md bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700"
                    >
                      Abrir SMS para pagar
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `PASE ${total}`;
                        navigator.clipboard?.writeText(text);
                        alert(`Copiado: "${text}"\nEnvíe este mensaje al ${selectedPaymentMethod.accountDetails}`);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-green-600 text-green-700 px-3 py-1.5 text-sm font-medium hover:bg-green-50"
                    >
                      Copiar mensaje
                    </button>
                  </div>
                  <p className="text-xs text-green-600">
                    Envíe <code className="bg-green-100 px-1 rounded">PASE {total}</code> por SMS al número {selectedPaymentMethod.accountDetails}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          {section && (
            <div className="border-t pt-4 flex items-center justify-between">
              <span className="font-semibold">Total: {formatCurrency(total, section.currency)}</span>
              <Button type="submit" disabled={!paymentMethod || reserveMutation.isPending}>
                {reserveMutation.isPending ? "Reservando..." : "Reservar Entradas"}
              </Button>
            </div>
          )}

          {orderError && <p className="text-sm text-red-600">{orderError}</p>}
        </form>
      </div>
    </div>
  );
}
