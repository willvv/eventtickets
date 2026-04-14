"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, X, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TicketStateBadge } from "@/components/tickets/ticket-state-badge";
import { TicketState } from "@/types/ticket";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface QrScannerProps {
  orgId: string;
  eventId?: string;
}

type ScanResult = {
  alreadyScanned: boolean;
  ticket: {
    _id: string;
    attendeeName?: string;
    seatLabel?: string;
    sectionName: string;
    state: string;
    orderId: string;
  };
  groupTickets: { id: string; seatLabel?: string; attendeeName?: string }[];
};

export function QrScanner({ orgId, eventId }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const animFrameRef = useRef<number>(0);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const scanMutation = trpc.tickets.scan.useMutation({
    onSuccess: (data) => {
      const result = data as unknown as ScanResult;
      setResult(result);
      if (result.groupTickets.length > 0) {
        setShowGroupPrompt(true);
      }
    },
    onError: (err) => setError(err.message),
  });

  const scanGroupMutation = trpc.tickets.scanGroup.useMutation();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        scanLoop();
      }
    } catch {
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(animFrameRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const scanLoop = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Dynamic import to avoid SSR issues
    const jsQR = (await import("jsqr")).default;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      stopCamera();
      handleQrDetected(code.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const handleQrDetected = (qrString: string) => {
    setError(null);
    scanMutation.mutate({ qrString, orgId });
  };

  const handleManualScan = () => {
    const val = manualInputRef.current?.value.trim() ?? "";
    if (!val) return;
    handleQrDetected(val);
  };

  const handleGroupScan = () => {
    if (!result) return;
    scanGroupMutation.mutate({ orderId: result.ticket.orderId, orgId });
    setShowGroupPrompt(false);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    if (manualInputRef.current) manualInputRef.current.value = "";
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Escáner de Entradas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera view */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button onClick={startCamera} size="lg">
                  <Camera className="h-5 w-5 mr-2" /> Iniciar Cámara
                </Button>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white w-48 h-48 rounded-lg opacity-70" />
              </div>
            )}
          </div>

          {scanning && (
            <Button variant="outline" onClick={stopCamera} className="w-full">
              <X className="h-4 w-4 mr-2" /> Detener Cámara
            </Button>
          )}

          {/* Manual input */}
          <form onSubmit={(e) => { e.preventDefault(); handleManualScan(); }} className="flex gap-2">
            <input
              ref={manualInputRef}
              className="flex-1 border rounded-md px-3 py-2 text-sm"
              placeholder="Buscar por nombre, orden o asiento..."
            />
            <Button type="submit" disabled={scanMutation.isPending}>
              Buscar
            </Button>
          </form>

          {/* Result */}
          {(result || error) && (
            <div className={`rounded-lg p-4 border ${result?.alreadyScanned ? "bg-yellow-50 border-yellow-200" : result ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {error && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              {result && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {result.alreadyScanned ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    <span className="font-semibold">
                      {result.alreadyScanned ? "Ya escaneada anteriormente" : "¡Entrada válida!"}
                    </span>
                  </div>
                  <p className="text-sm"><strong>Sección:</strong> {result.ticket.sectionName}</p>
                  {result.ticket.seatLabel && <p className="text-sm"><strong>Asiento:</strong> {result.ticket.seatLabel}</p>}
                  {result.ticket.attendeeName && <p className="text-sm"><strong>Asistente:</strong> {result.ticket.attendeeName}</p>}
                  <TicketStateBadge state={result.ticket.state as TicketState} />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={reset} className="mt-3 w-full">
                Escanear Otra
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group scan prompt */}
      <ConfirmDialog
        open={showGroupPrompt}
        onOpenChange={setShowGroupPrompt}
        title="Grupo de Entradas"
        description={`Esta orden tiene ${result?.groupTickets.length ?? 0} entrada(s) adicional(es). ¿Marcar todas como ingresadas?`}
        confirmLabel="Sí, Marcar Todas"
        cancelLabel="No, Solo Esta"
        onConfirm={handleGroupScan}
        loading={scanGroupMutation.isPending}
      />
    </div>
  );
}
