"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function CredentialsForm({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      callbackUrl,
      redirect: false,
    });
    console.log("signIn result:", JSON.stringify(result));
    setLoading(false);
    if (!result) {
      setError("Sin respuesta del servidor");
    } else if (result.error) {
      setError("Credenciales incorrectas");
    } else if (result.ok && result.url) {
      window.location.href = result.url;
    } else {
      setError("Error desconocido: " + JSON.stringify(result));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
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
