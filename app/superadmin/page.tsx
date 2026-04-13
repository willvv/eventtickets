import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Role } from "@/types/roles";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.SUPERADMIN) redirect("/auth/signin");

  await connectDB();
  const [totalOrgs, totalUsers, totalEvents, totalTickets] = await Promise.all([
    Organization.countDocuments(),
    User.countDocuments(),
    Event.countDocuments(),
    Ticket.countDocuments(),
  ]);

  const orgs = await Organization.find().sort({ createdAt: -1 }).limit(10);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Administración de Plataforma</h1>
            <p className="text-sm text-muted-foreground">Entradas CR — Superadmin</p>
          </div>
          <Button asChild size="sm">
            <Link href="/superadmin/organizations/new">Nueva Organización</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Organizaciones", value: totalOrgs },
            { label: "Usuarios", value: totalUsers },
            { label: "Eventos", value: totalEvents },
            { label: "Entradas", value: totalTickets },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Organizaciones</h2>
          <div className="space-y-3">
            {orgs.map((org) => (
              <Card key={org._id.toString()}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">/{org.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    {org.isSuspended && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Suspendida</span>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/superadmin/organizations/${org._id}`}>Gestionar</Link>
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
