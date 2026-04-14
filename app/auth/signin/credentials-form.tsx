"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function CredentialsForm({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    // redirect: true → next-auth handles navigation directly
    await signIn("credentials", {
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      callbackUrl,
      redirect: true,
    });
    // If we reach here, signIn returned without navigating (shouldn't happen with redirect:true)
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Iniciando..." : "Iniciar Sesión"}
      </Button>
    </form>
  );
}
