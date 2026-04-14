"use client";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { OrgNavbar } from "@/components/layout/org-navbar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function formatCurrency(amount: number, currency: string) {
  if (currency === "CRC") return `₡${amount.toLocaleString("es-CR")}`;
  return `$${amount.toLocaleString("en-US")}`;
}

export default function NewAdminOrderPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const { data: org } = trpc.organizations.getBySlug.useQuery({ slug: orgSlug });
  const { data: events } = trpc.events.listByOrg.useQuery(
    { orgId: org?._id?.toString() ?? "" },
    { enabled: !!org }
  );

  const [selectedEventId, setSelectedEventId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [autoIssue, setAutoIssue] = useState(false);
  const [error, setError] = useState("");

  const createMutation = trpc.tickets.createAdminOrder.useMutation({
    onSuccess: (data) => {
      const orderId = (data.order as any)._id;
      router.push(`/orders/${orderId}`);
    },
    onError: (e) => setError(e.message),
  });

  const selectedEvent = events?.find((e: any) => e._id.toString() === selectedEventId);
  const paymentMethods = (org as any)?.paymentMethods?.filter((m: any) => m.isActive) ?? [];

  const seats = (selectedEvent?.sectionPrices ?? []).flatMap((s: any) => {
    const qty = quantities[s.sectionId] ?? 0;
    return Array.from({ length: qty }, (_, i) => ({
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      seatLabel: `General ${i + 1}`,
      price: isComplimentary ? 0 : s.price,
      currency: s.currency,
    }));
  });
  const totalQty = seats.length;
  const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);
  const currency = seats[0]?.currency ?? "CRC";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || totalQty === 0) return;
    setError("");
    createMutation.mutate({
      eventId: selectedEventId,
      orgId: org?._id?.toString() ?? "",
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      paymentMethodId: isComplimentary ? undefined : (paymentMethodId || undefined),
      paymentNotes: paymentNotes || undefined,
      isComplimentary,
      autoIssue,
      seats,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OrgNavbar orgSlug={orgSlug} orgName={(org as any)?.name ?? "..."} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold" style={{ color: "#1B426E" }}>Nueva Orden (Admin)</h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${orgSlug}/orders`}>← Órdenes</Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event selection */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-sm" style={{ color: "#1B426E" }}>Evento</h2>
            <select
              required
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); setQuantities({}); }}
            >
              <option value="">Seleccionar evento...</option>
              {(events ?? []).filter((e: any) => e.status === "published").map((e: any) => (
                <option key={e._id.toString()} value={e._id.toString()}>{e.title}</option>
              ))}
            </select>
          </div>

          {/* Section qty selectors */}
          {selectedEvent && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-sm" style={{ color: "#1B426E" }}>Entradas</h2>
              </div>
              <div className="divide-y">
                {(selectedEvent.sectionPrices ?? []).map((s: any) => {
                  const qty = quantities[s.sectionId] ?? 0;
                  return (
                    <div key={s.sectionId} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{s.sectionName}</p>
                        <p className="text-sm font-semibold" style={{ color: isComplimentary ? "#aaa" : "#00CDB9" }}>
                          {isComplimentary ? "Cortesía" : formatCurrency(s.price, s.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button"
                          onClick={() => setQuantities((q) => ({ ...q, [s.sectionId]: Math.max(0, (q[s.sectionId] ?? 0) - 1) }))}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-full border-2 font-bold text-lg flex items-center justify-center disabled:opacity-30"
                          style={{ borderColor: "#00CDB9", color: "#00CDB9" }}>−</button>
                        <span className="w-6 text-center font-bold">{qty}</span>
                        <button type="button"
                          onClick={() => setQuantities((q) => ({ ...q, [s.sectionId]: (q[s.sectionId] ?? 0) + 1 }))}
                          className="w-8 h-8 rounded-full border-2 font-bold text-lg flex items-center justify-center"
                          style={{ borderColor: "#00CDB9", color: "#00CDB9" }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalQty > 0 && (
                <div className="px-4 py-3 border-t flex justify-between font-semibold text-sm bg-gray-50">
                  <span>Total ({totalQty} entrada{totalQty !== 1 ? "s" : ""})</span>
                  <span style={{ color: "#00CDB9" }}>{isComplimentary ? "Cortesía" : formatCurrency(totalAmount, currency)}</span>
                </div>
              )}
            </div>
          )}

          {/* Customer info */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-sm" style={{ color: "#1B426E" }}>Cliente</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre <span className="text-red-500">*</span></label>
                <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre completo" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Teléfono <span className="text-red-500">*</span></label>
                <input required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="8888-0000" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email (opcional)</label>
              <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="correo@ejemplo.com" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Payment + options */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-sm" style={{ color: "#1B426E" }}>Pago y Opciones</h2>

            {/* Complimentary toggle */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors"
              style={isComplimentary ? { borderColor: "#FFD700", backgroundColor: "#fffdf0" } : { borderColor: "#e5e7eb" }}>
              <input type="checkbox" checked={isComplimentary} onChange={(e) => setIsComplimentary(e.target.checked)}
                className="w-4 h-4" />
              <div>
                <p className="font-medium text-sm">🎁 Entrada de cortesía (gratuita)</p>
                <p className="text-xs text-gray-500">El precio se establece en ₡0 y se marca como cortesía</p>
              </div>
            </label>

            {/* Payment method (only if not complimentary) */}
            {!isComplimentary && paymentMethods.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600">Método de pago</label>
                <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {paymentMethods.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!isComplimentary && (
              <div>
                <label className="text-xs font-medium text-gray-600">Notas de pago</label>
                <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Referencia de pago..." className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
              </div>
            )}

            {/* Auto-issue toggle */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors"
              style={autoIssue ? { borderColor: "#00CDB9", backgroundColor: "#e6faf8" } : { borderColor: "#e5e7eb" }}>
              <input type="checkbox" checked={autoIssue} onChange={(e) => setAutoIssue(e.target.checked)}
                className="w-4 h-4" />
              <div>
                <p className="font-medium text-sm">⚡ Emitir automáticamente</p>
                <p className="text-xs text-gray-500">Las entradas se generan con QR de inmediato</p>
              </div>
            </label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

          <button
            type="submit"
            disabled={!selectedEventId || totalQty === 0 || !customerName || !customerPhone || (!isComplimentary && !paymentMethodId) || createMutation.isPending}
            className="w-full py-3 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#FF7F50" }}
          >
            {createMutation.isPending
              ? "Creando orden..."
              : `Crear orden — ${totalQty} entrada${totalQty !== 1 ? "s" : ""}${isComplimentary ? " (cortesía)" : ""}`}
          </button>
        </form>
      </main>
    </div>
  );
}
