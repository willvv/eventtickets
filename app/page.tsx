import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Entradas CR</h1>
          <p className="text-xl text-gray-600">
            Plataforma de venta y gestión de entradas para eventos en Costa Rica
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/events">Ver Eventos</Link>
          </Button>
          {session ? (
            <Button asChild variant="outline" size="lg">
              <Link href={
                session.user.role === "superadmin"
                  ? "/superadmin"
                  : session.user.orgSlug
                  ? `/org/${session.user.orgSlug}`
                  : "/events"
              }>
                Ir al Panel
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/signin">Iniciar Sesión</Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
