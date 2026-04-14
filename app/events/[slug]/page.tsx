"use client";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

function formatCurrency(amount: number, currency: string) {
  if (currency === "CRC") return `₡${amount.toLocaleString("es-CR")}`;
  return `$${amount.toLocaleString("en-US")}`;
}

function sinpeSmsLink(phone: string, amount: number) {
  return `sms:${phone.replace(/\D/g, "")}?body=${encodeURIComponent(`PASE ${amount}`)}`;
}

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: event, isLoading, error } = trpc.events.getPublicBySlug.useQuery({ slug });

  // quantities per sectionId
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orderError, setOrderError] = useState("");

  const reserveMutation = trpc.tickets.reserve.useMutation({
    onSuccess: (data) => router.push(`/orders/${(data.order as any)._id}`),
    onError: (e) => setOrderError(e.message),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0faf9" }}>
      <div className="text-center">
        <Image src="/logo.png" alt="Entradas CR" width={64} height={64} className="mx-auto mb-3 opacity-70" />
        <p className="text-gray-500">Cargando evento...</p>
      </div>
    </div>
  );
  if (error || !event) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Evento no encontrado.</p>
    </div>
  );

  const org = event.orgId as any;
  const publicPaymentMethods = org?.paymentMethods?.filter(
    (m: any) => m.availableInPublicPortal && m.isActive
  ) ?? [];

  const selectedPaymentMethod = publicPaymentMethods.find((m: any) => m.id === paymentMethod);
  const eventDate = new Date(event.date);

  // Build seats from quantities
  const selectedSeats = (event.sectionPrices ?? []).flatMap((s: any) => {
    const qty = quantities[s.sectionId] ?? 0;
    return Array.from({ length: qty }, (_, i) => ({
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      seatLabel: `General ${i + 1}`,
      price: s.price,
      currency: s.currency,
    }));
  });

  const totalQty = selectedSeats.length;
  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const currency = selectedSeats[0]?.currency ?? "CRC";

  function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (totalQty === 0 || !paymentMethod) return;
    setOrderError("");
    reserveMutation.mutate({
      eventId: (event as any)._id.toString(),
      orgId: (event as any).orgId._id?.toString() ?? (event as any).orgId.toString(),
      seats: selectedSeats,
      paymentMethodId: paymentMethod,
      customerName,
      customerPhone: phone,
      paymentNotes: notes || undefined,
    });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5fafa" }}>
      {/* Navbar */}
      <header style={{ backgroundColor: "#1B426E" }} className="text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/events" className="flex items-center gap-2">
            <Image src="/logo-32.png" alt="Entradas CR" width={28} height={28} className="rounded" />
            <span className="font-bold text-sm" style={{ color: "#00CDB9" }}>Entradas CR</span>
          </Link>
          <span className="text-white/30 mx-1">|</span>
          <span className="text-white/80 text-sm truncate">{event.title}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-12">
        {/* Event info card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-4">
          <div className="h-2" style={{ background: "linear-gradient(90deg, #00CDB9, #1B426E, #FF7F50)" }} />
          <div className="p-5">
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#1B426E" }}>{event.title}</h1>
            <p className="text-gray-600 text-sm mb-0.5">
              📅 {eventDate.toLocaleDateString("es-CR", { dateStyle: "full" })} a las{" "}
              {eventDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-gray-600 text-sm">📍 {event.locationName}{event.locationAddress ? ` — ${event.locationAddress}` : ""}</p>
            {event.description && <p className="text-gray-600 text-sm mt-2">{event.description}</p>}
          </div>
        </div>

        {/* Ticket purchase form */}
        <form onSubmit={handleReserve} className="space-y-4">
          {/* Section qty selectors */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold" style={{ color: "#1B426E" }}>Seleccionar Entradas</h2>
            </div>
            <div className="divide-y">
              {(event.sectionPrices ?? []).map((s: any) => {
                const qty = quantities[s.sectionId] ?? 0;
                return (
                  <div key={s.sectionId} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{s.sectionName}</p>
                      <p className="text-sm font-semibold" style={{ color: "#00CDB9" }}>
                        {formatCurrency(s.price, s.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantities((q) => ({ ...q, [s.sectionId]: Math.max(0, (q[s.sectionId] ?? 0) - 1) }))}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-full border-2 font-bold text-lg flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ borderColor: "#00CDB9", color: "#00CDB9" }}
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold text-base">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQuantities((q) => ({ ...q, [s.sectionId]: Math.min(10, (q[s.sectionId] ?? 0) + 1) }))}
                        disabled={qty >= 10}
                        className="w-8 h-8 rounded-full border-2 font-bold text-lg flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ borderColor: "#00CDB9", color: "#00CDB9" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order summary */}
          {totalQty > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold" style={{ color: "#1B426E" }}>Resumen</h2>
              </div>
              <div className="p-4 space-y-1.5">
                {(event.sectionPrices ?? []).filter((s: any) => (quantities[s.sectionId] ?? 0) > 0).map((s: any) => (
                  <div key={s.sectionId} className="flex justify-between text-sm">
                    <span>{quantities[s.sectionId]}× {s.sectionName}</span>
                    <span className="font-medium">{formatCurrency(s.price * (quantities[s.sectionId] ?? 0), s.currency)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total ({totalQty} entrada{totalQty !== 1 ? "s" : ""})</span>
                  <span style={{ color: "#00CDB9" }}>{formatCurrency(totalAmount, currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment method */}
          {totalQty > 0 && publicPaymentMethods.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold" style={{ color: "#1B426E" }}>Método de Pago</h2>
              </div>
              <div className="divide-y">
                {publicPaymentMethods.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className="w-full p-4 text-left transition-colors"
                    style={paymentMethod === m.id ? { backgroundColor: "#e6faf8" } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: paymentMethod === m.id ? "#00CDB9" : "#ccc" }}>
                        {paymentMethod === m.id && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00CDB9" }} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{m.name}</p>
                        {m.instructions && <p className="text-xs text-gray-500">{m.instructions}</p>}
                        {m.accountDetails && <p className="text-xs text-gray-500">{m.accountDetails}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer info + SINPE helper */}
          {totalQty > 0 && paymentMethod && (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold" style={{ color: "#1B426E" }}>Tus Datos</h2>
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre completo <span className="text-red-500">*</span></label>
                <input
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "#00CDB9" } as any}
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

              {/* SINPE helper */}
              {selectedPaymentMethod?.type === "mobile-payment" && selectedPaymentMethod?.accountDetails && (
                <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#e6faf8", border: "1px solid #99e8e0" }}>
                  <p className="text-sm font-semibold" style={{ color: "#1B426E" }}>Pago por SINPE Móvil</p>
                  <p className="text-sm" style={{ color: "#1B426E" }}>
                    Número: <strong>{selectedPaymentMethod.accountDetails}</strong>
                  </p>
                  <p className="text-sm" style={{ color: "#1B426E" }}>
                    Monto: <strong>{formatCurrency(totalAmount, currency)}</strong>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={sinpeSmsLink(selectedPaymentMethod.accountDetails, totalAmount)}
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white"
                      style={{ backgroundColor: "#00CDB9" }}
                    >
                      Abrir SMS para pagar
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`PASE ${totalAmount}`);
                        alert(`Copiado: "PASE ${totalAmount}"\nEnvíe al ${selectedPaymentMethod.accountDetails}`);
                      }}
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium"
                      style={{ borderColor: "#00CDB9", color: "#00CDB9" }}
                    >
                      Copiar mensaje
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#1B426E" }}>
                    Envíe <code className="px-1 rounded text-xs" style={{ backgroundColor: "#c0ede9" }}>PASE {totalAmount}</code> por SMS al número {selectedPaymentMethod.accountDetails}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          {totalQty > 0 && paymentMethod && (
            <button
              type="submit"
              disabled={!customerName || !phone || reserveMutation.isPending}
              className="w-full py-3 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#FF7F50" }}
            >
              {reserveMutation.isPending ? "Reservando..." : `Reservar ${totalQty} entrada${totalQty !== 1 ? "s" : ""} — ${formatCurrency(totalAmount, currency)}`}
            </button>
          )}

          {orderError && <p className="text-sm text-red-600 text-center">{orderError}</p>}
        </form>
      </div>
    </div>
  );
}
