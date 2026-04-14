"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function CredentialsForm({ callbackUrl }: { callbackUrl: string }) {
  const [csrfToken, setCsrfToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken || ""));
  }, []);

  return (
    <form ref={formRef} action="/api/auth/callback/credentials" method="POST" className="space-y-3">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
      <Button type="submit" className="w-full" disabled={!csrfToken}>
        Iniciar Sesión
      </Button>
    </form>
  );
}
