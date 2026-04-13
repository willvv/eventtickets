"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewEventPage() {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    locationName: "",
    locationAddress: "",
    date: "",
  });

  const { data: org } = trpc.organizations.getBySlug.useQuery({ slug: params.orgSlug });

  const createEvent = trpc.events.create.useMutation({
    onSuccess: (event) => {
      router.push(`/org/${params.orgSlug}/events/${event._id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    createEvent.mutate({
      orgId: org._id.toString(),
      data: {
        title: form.title,
        description: form.description || undefined,
        locationName: form.locationName,
        locationAddress: form.locationAddress || undefined,
        date: new Date(form.date),
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Crear Evento</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nombre del Evento *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha y Hora *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationName">Lugar *</Label>
                <Input
                  id="locationName"
                  value={form.locationName}
                  onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationAddress">Dirección</Label>
                <Input
                  id="locationAddress"
                  value={form.locationAddress}
                  onChange={(e) => setForm((f) => ({ ...f, locationAddress: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  id="description"
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              {createEvent.error && (
                <p className="text-red-600 text-sm">{createEvent.error.message}</p>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={createEvent.isPending}>
                  {createEvent.isPending ? "Creando..." : "Crear Evento"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
