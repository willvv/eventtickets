import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateCR, formatCurrency } from "@/lib/utils/date-format";
import Link from "next/link";
import { TicketState } from "@/types/ticket";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

export default async function EventDetailPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  await connectDB();
  const org = await Organization.findOne({ slug: orgSlug });
  if (!org) redirect("/");

  const event = await Event.findOne({ _id: eventId, orgId: org._id });
  if (!event) redirect(`/org/${orgSlug}/events`);

  const [totalTickets, soldTickets, scannedTickets] = await Promise.all([
    Ticket.countDocuments({ eventId: event._id }),
    Ticket.countDocuments({ eventId: event._id, state: { $in: [TicketState.ISSUED, TicketState.CLAIMED, TicketState.SCANNED] } }),
    Ticket.countDocuments({ eventId: event._id, state: TicketState.SCANNED }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={event.status === "published" ? "success" : event.status === "draft" ? "secondary" : "destructive"} className="text-xs">
                {STATUS_LABELS[event.status] ?? event.status}
              </Badge>
              <span className="text-sm text-muted-foreground">{formatDateCR(event.date, "PPPp")}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild size="sm" variant="outline">
              <Link href={`/org/${orgSlug}/events/${eventId}/scanner`}>Escáner</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/org/${orgSlug}/events/${eventId}/tickets`}>Entradas</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/org/${orgSlug}/events/${eventId}/layout-editor`}>Editor de Mapa</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Entradas Vendidas", value: soldTickets },
            { label: "Escaneadas", value: scannedTickets },
            { label: "Total Emitidas", value: totalTickets },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Event info */}
        <Card>
          <CardHeader><CardTitle>Información del Evento</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Lugar:</span> {event.locationName}</div>
              {event.locationAddress && <div><span className="text-muted-foreground">Dirección:</span> {event.locationAddress}</div>}
              <div><span className="text-muted-foreground">Fecha:</span> {formatDateCR(event.date, "PPPp")}</div>
            </div>
            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
          </CardContent>
        </Card>

        {/* Section prices */}
        {event.sectionPrices.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Precios por Sección</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {event.sectionPrices.map((sp) => (
                  <div key={sp.sectionId} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="font-medium">{sp.sectionName}</span>
                    <span className="text-green-700 font-semibold">
                      {formatCurrency(sp.price, sp.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
