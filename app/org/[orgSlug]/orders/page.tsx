import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Order } from "@/models/Order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueOrderButton } from "@/components/tickets/issue-order-button";
import { CancelOrderButton } from "@/components/tickets/cancel-order-button";
import { OrgNavbar } from "@/components/layout/org-navbar";
import { formatCurrency } from "@/lib/utils/date-format";
import Link from "next/link";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  reserved: "outline",
  paid: "secondary",
  issued: "default",
  cancelled: "destructive",
  refunded: "destructive",
};

const ALL_STATUSES = ["reserved", "paid", "issued", "cancelled"];

export default async function OrgOrdersPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const { status } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  await connectDB();
  const org = await Organization.findOne({ slug: orgSlug });
  if (!org) redirect("/");

  const filter: Record<string, unknown> = { orgId: org._id };
  if (status && ALL_STATUSES.includes(status)) filter.status = status;

  const orders = await Order.find(filter)
    .populate("eventId", "title")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const totalByStatus = await Order.aggregate([
    { $match: { orgId: org._id } },
    { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <OrgNavbar orgSlug={orgSlug} orgName={org.name} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: "#1B426E" }}>Órdenes</h1>
          <Button asChild style={{ backgroundColor: "#FF7F50", color: "white" }} size="sm">
            <Link href={`/org/${orgSlug}/orders/new`}>+ Nueva Orden</Link>
          </Button>
        </div>

        {/* Summary filter cards */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/org/${orgSlug}/orders`}>
            <Card className={`px-4 py-3 cursor-pointer hover:shadow-md transition-shadow ${!status ? "ring-2" : ""}`}
              style={!status ? { borderColor: "#00CDB9" } : {}}>
              <div className="text-xs font-medium text-muted-foreground">Todos</div>
              <div className="text-2xl font-bold">{totalByStatus.reduce((s, r) => s + r.count, 0)}</div>
            </Card>
          </Link>
          {ALL_STATUSES.map((s) => {
            const row = totalByStatus.find((r) => r._id === s);
            if (!row) return null;
            return (
              <Link key={s} href={`/org/${orgSlug}/orders?status=${s}`}>
                <Card className={`px-4 py-3 cursor-pointer hover:shadow-md transition-shadow ${status === s ? "border-2" : ""}`}
                  style={status === s ? { borderColor: "#00CDB9" } : {}}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={STATUS_VARIANTS[s] ?? "secondary"}>
                      {STATUS_LABELS[s] ?? s}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">{row.count}</div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Orders table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {status ? `Órdenes — ${STATUS_LABELS[status] ?? status}` : "Todas las Órdenes"}
              <span className="text-sm font-normal text-muted-foreground ml-2">({orders.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {orders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No hay órdenes para este filtro.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cliente</th>
                    <th className="text-left py-2 pr-4">Evento</th>
                    <th className="text-left py-2 pr-4">Pago</th>
                    <th className="text-left py-2 pr-4">Estado</th>
                    <th className="text-right py-2 pr-4">Total</th>
                    <th className="text-right py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const event = order.eventId as any;
                    const orderId = (order._id as any).toString();
                    return (
                      <tr key={orderId} className="border-b hover:bg-muted/50 align-top">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{order.customerName ?? "—"}</div>
                          {order.customerPhone && <div className="text-xs text-muted-foreground">{order.customerPhone}</div>}
                          {order.customerEmail && <div className="text-xs text-muted-foreground">{order.customerEmail}</div>}
                        </td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/org/${orgSlug}/events/${(event?._id ?? order.eventId)?.toString()}/tickets`}
                            className="hover:underline font-medium"
                            style={{ color: "#1B426E" }}
                          >
                            {event?.title ?? "—"}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <div>{PAYMENT_TYPE_LABELS[order.paymentMethodType] ?? order.paymentMethodType}</div>
                          {order.paymentNotes && <div className="text-xs text-muted-foreground truncate max-w-[120px]">{order.paymentNotes}</div>}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right pr-4 font-semibold">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/orders/${orderId}`}>Ver</Link>
                            </Button>
                            {(order.status === "reserved" || order.status === "paid") && (
                              <IssueOrderButton
                                orderId={orderId}
                                orgId={org._id.toString()}
                                customerName={order.customerName ?? undefined}
                                customerPhone={order.customerPhone ?? undefined}
                                eventTitle={(order.eventId as any)?.title}
                              />
                            )}
                            {order.status !== "cancelled" && order.status !== "issued" && (
                              <CancelOrderButton
                                orderId={orderId}
                                orgId={org._id.toString()}
                                customerName={order.customerName ?? undefined}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
