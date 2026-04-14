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
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Órdenes — {org.name}</h1>
            <p className="text-sm text-muted-foreground">{orders.length} órdenes mostradas</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${orgSlug}`}>← Panel</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Summary cards */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/org/${orgSlug}/orders`}>
            <Card className={`px-4 py-3 cursor-pointer hover:shadow-md transition-shadow ${!status ? "ring-2 ring-blue-500" : ""}`}>
              <div className="text-sm font-medium text-muted-foreground">Todos</div>
              <div className="text-xl font-bold">{totalByStatus.reduce((s, r) => s + r.count, 0)}</div>
            </Card>
          </Link>
          {totalByStatus.map((row) => (
            <Link key={row._id} href={`/org/${orgSlug}/orders?status=${row._id}`}>
              <Card className={`px-4 py-3 cursor-pointer hover:shadow-md transition-shadow ${status === row._id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={STATUS_VARIANTS[row._id] ?? "secondary"}>
                    {STATUS_LABELS[row._id] ?? row._id}
                  </Badge>
                </div>
                <div className="text-xl font-bold">{row.count}</div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Orders table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {status ? `Órdenes — ${STATUS_LABELS[status] ?? status}` : "Todas las Órdenes"}
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
                    <th className="text-right py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const event = order.eventId as any;
                    return (
                      <tr key={(order._id as any).toString()} className="border-b hover:bg-muted/50">
                        <td className="py-2 pr-4">
                          <div className="font-medium">{order.customerName ?? "—"}</div>
                          {order.customerPhone && (
                            <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                          )}
                          {order.customerEmail && (
                            <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/org/${orgSlug}/events/${(event?._id ?? order.eventId)?.toString()}/tickets`}
                            className="text-blue-600 hover:underline"
                          >
                            {event?.title ?? "—"}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <div>{PAYMENT_TYPE_LABELS[order.paymentMethodType] ?? order.paymentMethodType}</div>
                          {order.paymentNotes && (
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">{order.paymentNotes}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-right pr-4 font-medium">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/orders/${(order._id as any).toString()}`}>Ver</Link>
                            </Button>
                            {(order.status === "reserved" || order.status === "paid") && (
                              <IssueOrderButton
                                orderId={(order._id as any).toString()}
                                orgId={org._id.toString()}
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
