// components/WorkerQR.tsx
"use client";
import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function WorkerQR({ profile }: { profile: any }) {
  const qrRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  
  const uid = profile?.id ?? "unknown-id";
  const payload = JSON.stringify({ 
    id: uid, 
    name: profile?.name ?? "",
    type: "worker"
  });

  function downloadPNG() {
    const svg = qrRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    // Convert SVG to PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `medmitra-qr-${uid.slice(0, 8)}.png`;
      a.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback: select text
      const textArea = document.createElement("textarea");
      textArea.value = payload;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareQR() {
    if (navigator.share) {
      try {
        const svg = qrRef.current?.querySelector("svg") as SVGSVGElement | null;
        if (svg) {
          const svgData = new XMLSerializer().serializeToString(svg);
          const blob = new Blob([svgData], { type: "image/svg+xml" });
          const file = new File([blob], `medmitra-qr-${uid.slice(0, 8)}.svg`, { type: "image/svg+xml" });
          await navigator.share({
            title: "Med Mitra Health ID",
            text: `My Health ID: ${uid.slice(0, 8)}...`,
            files: [file],
          });
        }
      } catch (err) {
        console.error("Share failed:", err);
      }
    }
  }

  return (
    <div className="card text-center bg-gradient-to-br from-white via-primary-50/50 to-accent-50/50 border-2 border-primary-300/50">
      <div className="mb-3 font-semibold text-primary-700 text-lg">Show this QR to the doctor</div>

      <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl border-2 border-primary-400 shadow-medium">
        <QRCodeSVG 
          value={payload} 
          size={200} 
          level="M"
          includeMargin={true}
          fgColor="#3b82f6"
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2 justify-center">
          <button 
            onClick={downloadPNG} 
            className="px-4 py-2 bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-700 rounded-lg hover:from-primary-200 hover:to-secondary-200 transition-all shadow-soft text-sm font-semibold"
          >
            📥 Download
          </button>
          <button 
            onClick={copyPayload} 
            className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all shadow-medium text-sm font-semibold"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>
        
        {navigator.share && (
          <button 
            onClick={shareQR} 
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            📤 Share
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 p-2 bg-gray-50 rounded">
        QR contains worker ID and name only.
      </div>
    </div>
  );
}

