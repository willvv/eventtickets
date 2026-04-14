import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/date-format";
import Link from "next/link";
import { CalendarDays, Ticket as TicketIcon, Users, TrendingUp } from "lucide-react";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgDashboard({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  await connectDB();
  const org = await Organization.findOne({ slug: orgSlug });
  if (!org) redirect("/");

  const [events, totalTickets, issuedTickets] = await Promise.all([
    Event.find({ orgId: org._id }).sort({ date: -1 }).limit(5),
    Ticket.countDocuments({ orgId: org._id }),
    Ticket.countDocuments({ orgId: org._id, state: { $in: ["issued", "claimed", "scanned"] } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">Panel de Administración</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/org/${orgSlug}/events`}>Eventos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/org/${orgSlug}/orders`}>Órdenes</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/org/${orgSlug}/members`}>Miembros</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/org/${orgSlug}/settings`}>Configuración</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TicketIcon className="h-4 w-4" /> Entradas Emitidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{issuedTickets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total Entradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTickets}</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Eventos Recientes</h2>
            <Button asChild size="sm">
              <Link href={`/org/${orgSlug}/events/new`}>Crear Evento</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event._id.toString()}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.locationName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      event.status === "published" ? "bg-green-100 text-green-800" :
                      event.status === "draft" ? "bg-gray-100 text-gray-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {event.status === "published" ? "Publicado" : event.status === "draft" ? "Borrador" : event.status}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/org/${orgSlug}/events/${event._id}`}>Ver</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
