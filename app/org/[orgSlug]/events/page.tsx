import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { Order } from "@/models/Order";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrgNavbar } from "@/components/layout/org-navbar";
import { formatCurrency } from "@/lib/utils/date-format";
import Link from "next/link";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

export default async function EventsListPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const { tab = "upcoming" } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  await connectDB();
  const org = await Organization.findOne({ slug: orgSlug });
  if (!org) redirect("/");

  const now = new Date();
  let filter: Record<string, unknown> = { orgId: org._id };

  if (tab === "upcoming") {
    filter.status = "published";
    filter.date = { $gte: now };
  } else if (tab === "past") {
    filter.$or = [{ date: { $lt: now } }, { status: { $in: ["closed", "cancelled"] } }];
  } else if (tab === "draft") {
    filter.status = "draft";
  }
  // tab === "all" → no extra filter

  const events = await Event.find(filter).sort(
    tab === "upcoming" ? { date: 1 } : { date: -1 }
  );

  // Get ticket + order counts per event
  const eventIds = events.map((e) => e._id);
  const [ticketStats, orderStats] = await Promise.all([
    Ticket.aggregate([
      { $match: { eventId: { $in: eventIds }, orgId: org._id } },
      { $group: { _id: { eventId: "$eventId", state: "$state" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { eventId: { $in: eventIds }, orgId: org._id } },
      { $group: { _id: { eventId: "$eventId", status: "$status" }, count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
    ]),
  ]);

  // Index by eventId
  const ticketsByEvent: Record<string, Record<string, number>> = {};
  for (const t of ticketStats) {
    const eid = t._id.eventId.toString();
    ticketsByEvent[eid] = ticketsByEvent[eid] ?? {};
    ticketsByEvent[eid][t._id.state] = t.count;
  }

  const revenueByEvent: Record<string, number> = {};
  const pendingByEvent: Record<string, number> = {};
  for (const o of orderStats) {
    const eid = o._id.eventId.toString();
    if (o._id.status === "issued") revenueByEvent[eid] = (revenueByEvent[eid] ?? 0) + o.revenue;
    if (o._id.status === "reserved") pendingByEvent[eid] = (pendingByEvent[eid] ?? 0) + o.count;
  }

  const tabs = [
    { key: "upcoming", label: "Próximos" },
    { key: "all", label: "Todos" },
    { key: "past", label: "Pasados" },
    { key: "draft", label: "Borradores" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <OrgNavbar orgSlug={orgSlug} orgName={org.name} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs + create button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-white rounded-lg border">
            {tabs.map((t) => (
              <Link key={t.key} href={`/org/${orgSlug}/events?tab=${t.key}`}>
                <span
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block cursor-pointer"
                  style={tab === t.key
                    ? { backgroundColor: "#1B426E", color: "white" }
                    : { color: "#666" }}
                >
                  {t.label}
                </span>
              </Link>
            ))}
          </div>
          <Button asChild style={{ backgroundColor: "#FF7F50", color: "white" }}>
            <Link href={`/org/${orgSlug}/events/new`}>+ Crear Evento</Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-3">No hay eventos en esta categoría.</p>
            <Button asChild style={{ backgroundColor: "#FF7F50", color: "white" }}>
              <Link href={`/org/${orgSlug}/events/new`}>Crear primer evento</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const eid = event._id.toString();
              const stats = ticketsByEvent[eid] ?? {};
              const sold = (stats["issued"] ?? 0) + (stats["claimed"] ?? 0) + (stats["scanned"] ?? 0);
              const reserved = stats["reserved"] ?? 0;
              const pending = pendingByEvent[eid] ?? 0;
              const eventDate = new Date(event.date);
              const isPast = eventDate < now;

              return (
                <Card key={eid} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Color stripe */}
                      <div className="w-1.5 rounded-l-lg shrink-0"
                        style={{ backgroundColor: event.status === "published" ? "#00CDB9" : event.status === "draft" ? "#aaa" : "#EF4444" }} />

                      <div className="flex-1 p-4 flex items-center gap-4 flex-wrap">
                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-base truncate" style={{ color: "#1B426E" }}>
                              {event.title}
                            </h3>
                            <Badge variant={event.status === "published" ? "default" : event.status === "draft" ? "secondary" : "destructive"}
                              style={event.status === "published" ? { backgroundColor: "#e6faf8", color: "#00CDB9", border: "1px solid #99e8e0" } : {}}>
                              {STATUS_LABELS[event.status] ?? event.status}
                            </Badge>
                            {isPast && event.status === "published" && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Finalizado</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            📅 {eventDate.toLocaleDateString("es-CR", { dateStyle: "medium" })} a las{" "}
                            {eventDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-sm text-muted-foreground">📍 {event.locationName}</p>
                        </div>

                        {/* Stats */}
                        {(sold > 0 || reserved > 0 || pending > 0) && (
                          <div className="flex gap-4 text-center shrink-0">
                            <div>
                              <p className="text-xl font-bold" style={{ color: "#00CDB9" }}>{sold}</p>
                              <p className="text-xs text-muted-foreground">Emitidas</p>
                            </div>
                            {reserved > 0 && (
                              <div>
                                <p className="text-xl font-bold text-amber-600">{reserved}</p>
                                <p className="text-xs text-muted-foreground">Reservadas</p>
                              </div>
                            )}
                            {pending > 0 && (
                              <div>
                                <p className="text-xl font-bold text-orange-500">{pending}</p>
                                <p className="text-xs text-muted-foreground">Órdenes pend.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/org/${orgSlug}/events/${eid}/tickets`}>Órdenes</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/org/${orgSlug}/events/${eid}/scanner`}>Escáner</Link>
                          </Button>
                          <Button asChild size="sm" style={{ backgroundColor: "#1B426E", color: "white" }}>
                            <Link href={`/org/${orgSlug}/events/${eid}`}>Gestionar</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
