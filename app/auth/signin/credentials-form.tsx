"use client";
import { Button } from "@/components/ui/button";

export function CredentialsForm({ callbackUrl, error }: { callbackUrl: string; error?: string }) {
  return (
    <form action="/api/login" method="POST" className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {error === "CredentialsSignin" || error === "missing" ? (
        <p className="text-sm text-red-600 text-center">Credenciales incorrectas</p>
      ) : null}
      <input
        name="email"
        type="email"
        placeholder="correo@ejemplo.com"
        required
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <input
        name="password"
        type="password"
        placeholder="Contraseña"
        required
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" className="w-full">
        Iniciar Sesión
      </Button>
    </form>
  );
}
