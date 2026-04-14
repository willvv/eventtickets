"use client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssueOrderButton({ orderId, orgId }: { orderId: string; orgId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  const issueMutation = trpc.tickets.issue.useMutation({
    onSuccess: () => router.refresh(),
    onError: (e) => setError(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(""); issueMutation.mutate({ orderId, orgId }); }} className="flex items-center gap-2">
      <Button type="submit" size="sm" disabled={issueMutation.isPending}>
        {issueMutation.isPending ? "Emitiendo..." : "Emitir"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
