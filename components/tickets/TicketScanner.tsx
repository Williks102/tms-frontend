'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

// Scanner de billet — caméra (QR) en priorité, avec repli sur un champ de
// saisie toujours visible (douchette USB/Bluetooth qui tape comme un clavier,
// ou saisie manuelle de la référence). Les deux chemins appellent onDetect
// avec la même chaîne (la référence du billet, ex: TCK-2026-000042).
export function TicketScanner({ onDetect, disabled, placeholder }: {
  onDetect: (reference: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDetectRef = useRef(onDetect);
  const cooldownRef  = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let stopped = false;

    function tick() {
      if (stopped) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data && !cooldownRef.current) {
            cooldownRef.current = true;
            onDetectRef.current(code.data);
            setTimeout(() => { cooldownRef.current = false; }, 2500);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Caméra non disponible sur cet appareil — utilisez la saisie ci-dessous.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
          tick();
        }
      } catch {
        setCameraError("Caméra refusée ou indisponible — utilisez la saisie ci-dessous.");
      }
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = manualRef.trim();
    if (!ref) return;
    onDetect(ref);
    setManualRef('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-slate-900/60 border border-slate-800/60 aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            Activation de la caméra...
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-amber-400 p-4">
            {cameraError}
          </div>
        )}
        {cameraReady && (
          <div className="absolute inset-0 border-2 border-blue-500/40 m-8 rounded-xl pointer-events-none" />
        )}
      </div>

      <form onSubmit={submitManual} className="flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          disabled={disabled}
          value={manualRef}
          onChange={(e) => setManualRef(e.target.value)}
          placeholder={placeholder ?? "Référence du billet (douchette ou saisie manuelle)"}
          className="input flex-1 font-[family-name:var(--font-mono)]"
        />
        <button
          type="submit"
          disabled={disabled || !manualRef.trim()}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Valider
        </button>
      </form>
    </div>
  );
}
