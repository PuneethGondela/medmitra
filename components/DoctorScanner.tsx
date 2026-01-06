// components/DoctorScanner.tsx
"use client";
import React, { useRef, useEffect, useState } from "react";
import jsQR from "jsqr";

export default function DoctorScanner({
  onResult,
  onCancel
}: {
  onResult: (payload: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let raf = 0;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        tick();
      } catch (err) {
        console.error("Camera error", err);
        setError("Cannot access camera. Please allow camera permissions.");
      }
    }

    function stop() {
      const s = (videoRef.current?.srcObject) as MediaStream | null;
      s?.getTracks().forEach((t) => t.stop());
      if (raf) {
        cancelAnimationFrame(raf);
      }
    }

    function tick() {
      if (!mounted) return;
      raf = requestAnimationFrame(tick);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code?.data) {
        stop();
        onResult(code.data);
      }
    }

    start();

    return () => {
      mounted = false;
      stop();
    };
  }, [onResult]);

  return (
    <div className="card">
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 mb-1">Scan Worker QR Code</h3>
        <p className="text-sm text-gray-600">Point camera at worker&apos;s QR code</p>
      </div>

      {error ? (
        <div className="bg-danger-50 text-danger-700 p-4 rounded-lg border border-danger-200">
          {error}
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 border-4 border-primary-500 rounded-lg pointer-events-none" />
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

