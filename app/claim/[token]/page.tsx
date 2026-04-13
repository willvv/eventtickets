import { notFound } from "next/navigation";
import { hashToken, isTokenExpired } from "@/lib/tickets/claim-token";
import { connectDB } from "@/lib/db/mongoose";
import { ClaimToken } from "@/models/ClaimToken";
import { Ticket } from "@/models/Ticket";
import { Event } from "@/models/Event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Download } from "lucide-react";
import Link from "next/link";

interface ClaimPageProps {
  params: Promise<{ token: string }>;
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { token } = await params;
  await connectDB();

  const hashed = hashToken(token);
  const claimToken = await ClaimToken.findOne({ hashedToken: hashed });

  if (!claimToken) return notFound();

  if (claimToken.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <CardTitle>Enlace Ya Utilizado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Este enlace ya fue utilizado. Si necesita sus entradas nuevamente, contacte al organizador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isTokenExpired(claimToken.expiresAt)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Enlace Expirado</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">Este enlace ha expirado. Contacte al organizador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ticket = await Ticket.findById(claimToken.ticketId);
  const event = ticket ? await Event.findById(ticket.eventId) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <CardTitle>¡Sus Entradas Están Listas!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              No comparta este enlace. Una vez que descargue sus entradas, este enlace dejará de funcionar.
            </p>
          </div>

          {event && ticket && (
            <div className="space-y-3">
              <h3 className="font-semibold">{event.title}</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Sección: {ticket.sectionName}</p>
                {ticket.seatLabel && <p>Asiento: {ticket.seatLabel}</p>}
                {ticket.attendeeName && <p>Asistente: {ticket.attendeeName}</p>}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <ClaimButton token={token} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Mis entradas: ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Server Action to mark claimed
function ClaimButton({ token }: { token: string }) {
  return (
    <form action={`/api/claim/${token}`} method="POST">
      <Button type="submit" className="w-full" size="lg">
        <Download className="h-5 w-5 mr-2" />
        Descargar Mis Entradas (PDF)
      </Button>
    </form>
  );
}
