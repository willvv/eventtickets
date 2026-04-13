"use client";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { LayoutEditor } from "@/components/canvas/layout-editor";
import { CanvasLayout } from "@/types/canvas";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function LayoutEditorPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();

  const { data: org } = trpc.organizations.getBySlug.useQuery({ slug: params.orgSlug });

  const { data: event, isLoading } = trpc.events.getById.useQuery(
    { eventId: params.eventId, orgId: org?._id?.toString() ?? "" },
    { enabled: !!org }
  );

  const saveLayout = trpc.events.saveLayout.useMutation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleSave = (layout: CanvasLayout) => {
    if (!org) return;
    saveLayout.mutate({
      eventId: params.eventId,
      orgId: org._id.toString(),
      layoutJson: layout as unknown as Record<string, unknown>,
      layoutVersion: layout.version,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Editor de Mapa</h1>
          {event && <p className="text-sm text-muted-foreground">{event.title}</p>}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <LayoutEditor
          initialLayout={event?.layoutJson as CanvasLayout | undefined}
          onSave={handleSave}
          saving={saveLayout.isPending}
        />
        {saveLayout.isSuccess && (
          <p className="mt-3 text-green-600 text-sm">✓ Mapa guardado correctamente</p>
        )}
      </main>
    </div>
  );
}
