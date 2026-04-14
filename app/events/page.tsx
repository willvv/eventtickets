import { connectDB } from "@/lib/db/mongoose";
import { Event } from "@/models/Event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateCR } from "@/lib/utils/date-format";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  await connectDB();
  const events = await Event.find({ status: "published" })
    .sort({ date: 1 })
    .limit(50);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">Entradas CR</Link>
          <Link href="/auth/signin">
            <Button variant="outline" size="sm">Iniciar Sesión</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Eventos Disponibles</h1>

        {events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No hay eventos disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event._id.toString()} className="hover:shadow-md transition-shadow">
                {event.coverImageUrl && (
                  <div className="aspect-video overflow-hidden rounded-t-xl">
                    <img
                      src={event.coverImageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDateCR(event.date, "PPPp")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.locationName}</span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                  <Button asChild className="w-full" size="sm">
                    <Link href={`/events/${event.slug}`}>Ver Entradas</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
