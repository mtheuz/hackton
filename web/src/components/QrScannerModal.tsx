import { useEffect, useRef, useState } from 'react';

interface QrScannerModalProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const { default: jsQR } = await import('jsqr');
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        function tick() {
          if (cancelled || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
            frameRef.current = requestAnimationFrame(tick);
            return;
          }
          canvas!.width = video.videoWidth;
          canvas!.height = video.videoHeight;
          ctx!.drawImage(video, 0, 0, canvas!.width, canvas!.height);
          const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result?.data) {
            onScan(result.data);
            return;
          }
          frameRef.current = requestAnimationFrame(tick);
        }
        frameRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError('Não foi possível acessar a câmera. Permita o acesso e tente de novo.');
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="w-full" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/80" />
      </div>
      {error && <p className="mt-4 max-w-xs text-center text-sm text-white">{error}</p>}
      <button
        type="button"
        onClick={onClose}
        className="mt-6 min-h-11 rounded-full bg-white px-6 text-sm font-semibold text-ink-900"
      >
        Cancelar
      </button>
    </div>
  );
}
