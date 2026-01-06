// components/AddVisitExisting.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useState } from "react";
import { getCurrentUser, insertDocument, uploadFile } from "../lib/firebase-helpers";
import FormInput from "./FormInput";
import Button from "./Button";
import { extractEntities } from "../lib/ml-client";
import { Sparkles, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import VoiceInput from "./VoiceInput";

export default function AddVisitExisting({
  worker,
  onSaved,
}: {
  worker: any;
  onSaved: (rec: any) => void;
}) {
  const [diagnosisRaw, setDiagnosisRaw] = useState("");
  const [diagnosisSimple, setDiagnosisSimple] = useState("");
  const [prescription, setPrescription] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [entities, setEntities] = useState<any>(null);

  async function handleExtractEntities() {
    if (!prescription.trim()) return;

    setExtracting(true);
    setMessage(null);
    try {
      setMessage("🔄 Extracting entities... This may take 5-10 seconds on first use.");
      const result = await extractEntities(prescription);
      setEntities(result.entities);
      if (result.entities && Object.values(result.entities).some((arr: any) => arr.length > 0)) {
        setMessage("✅ Entities extracted successfully!");
      } else {
        setMessage("ℹ️ No entities found. You can continue manually.");
      }
    } catch (error: any) {
      console.error("Entity extraction failed:", error);
      setMessage(error.message || "Failed to extract entities. Please continue without it.");
      setEntities(null);
    } finally {
      setExtracting(false);
    }
  }

  // Helper to compress image
  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas to Blob failed"));
          }, "image/jpeg", 0.7);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!diagnosisRaw) {
      setMessage("Diagnosis is required");
      return;
    }

    setLoading(true);

    try {
      setMessage("⏳ Saving visit details... (Step 1/2)");
      const user = await getCurrentUser();
      const doctorId = user?.uid;
      if (!doctorId) throw new Error("Not authenticated");

      const recordData = {
        worker_id: worker.id,
        doctor_id: doctorId,
        diagnosis_raw: diagnosisRaw,
        diagnosis_simple: diagnosisSimple || diagnosisRaw,
        prescription_note: prescription,
        voice_note: voiceNote,
        severity,
        visit_date: Timestamp.now(),
      };

      const recordId = await insertDocument("records", recordData);
      const rec = { id: recordId, ...recordData };

      if (file) {
        setMessage("⏳ Compressing and uploading scan... (Step 2/2)");
        let fileToUpload: File | Blob = file;

        // Compress if image
        if (file.type.startsWith("image/")) {
          try {
            fileToUpload = await compressImage(file);
            console.log(`Compressed image size: ${fileToUpload.size} bytes`);
          } catch (err) {
            console.warn("Compression failed, uploading original", err);
          }
        }

        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `${worker.id}/${fileName}`;

        // Use the compressed blob
        const fileUrl = await uploadFile("health-files", filePath, fileToUpload);

        await insertDocument("attachments", {
          record_id: recordId,
          file_path: filePath,
          file_url: fileUrl,
          file_type: "xray",
          description: diagnosisSimple || "Attachment",
        });
      }

      setMessage("✅ Data added successfully! Visit saved to database.");
      onSaved(rec);

      // Clear form after short delay
      setTimeout(() => {
        setDiagnosisRaw("");
        setDiagnosisSimple("");
        setPrescription("");
        setVoiceNote("");
        setFile(null);
        setSeverity("low");
        setMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to save visit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8">
      <h3 className="text-xl md:text-2xl font-bold mb-6 text-slate-900 flex items-center gap-2">
        <span className="text-2xl">➕</span>
        Add Visit for {worker?.name ?? worker?.id?.slice(0, 8)}
      </h3>

      {message && (
        <div
          className={`mb-6 p-4 md:p-5 rounded-xl text-base font-semibold shadow-medium border-2 ${message.includes("success")
            ? "bg-green-50 text-green-800 border-green-300"
            : "bg-red-50 text-red-800 border-red-300"
            }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{message.includes("success") ? "✅" : "❌"}</span>
            <span>{message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Worker Info Section */}
        <div className="border-b border-slate-200 pb-6">
          <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-lg">👤</span>
            Worker Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Name</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium">
                {worker?.name || "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Health ID</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-medium text-sm">
                {worker?.id?.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis Section */}
        <div className="border-b border-slate-200 pb-6">
          <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🏥</span>
            Diagnosis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput
              label="Diagnosis (raw) *"
              name="diagnosisRaw"
              value={diagnosisRaw}
              onChange={(e) => setDiagnosisRaw(e.target.value)}
              placeholder="Enter full diagnosis"
              required
            />

            <FormInput
              label="Diagnosis (simple / spoken)"
              name="diagnosisSimple"
              value={diagnosisSimple}
              onChange={(e) => setDiagnosisSimple(e.target.value)}
              placeholder="Simplified version for voice"
            />
          </div>
        </div>

        {/* Prescription Section */}
        <div className="border-b border-slate-200 pb-6">
          <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-lg">💊</span>
            Prescription
          </h4>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900">
                Prescription (medicines) *
              </label>
              <div className="flex gap-2">
                <VoiceInput
                  onTranscript={(text) => {
                    setPrescription(prev => prev ? prev + " " + text : text);
                  }}
                  className="inline-block"
                />
                <button
                  type="button"
                  onClick={handleExtractEntities}
                  disabled={extracting || !prescription.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-primary-800 text-white rounded-lg hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract Entities
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              value={prescription}
              onChange={(e) => {
                setPrescription(e.target.value);
                setEntities(null);
              }}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
              rows={4}
              placeholder="Enter prescription details, medicines, dosages, etc... (Or use Voice Input)"
            />
            {entities && (
              <div className="mt-3 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-300 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-bold text-slate-900">AI Extracted Entities:</div>
                </div>
                <div className="space-y-2 text-sm text-slate-800">
                  {entities.medicines?.length > 0 && (
                    <div className="p-2 bg-white rounded border border-primary-200">
                      <strong className="text-primary-800">💊 Medicines:</strong>{" "}
                      <span className="text-slate-900 font-semibold">{entities.medicines.join(", ")}</span>
                    </div>
                  )}
                  {entities.dosages?.length > 0 && (
                    <div className="p-2 bg-white rounded border border-primary-200">
                      <strong className="text-primary-800">📊 Dosages:</strong>{" "}
                      <span className="text-slate-900 font-semibold">{entities.dosages.join(", ")}</span>
                    </div>
                  )}
                  {entities.frequencies?.length > 0 && (
                    <div className="p-2 bg-white rounded border border-primary-200">
                      <strong className="text-primary-800">⏰ Frequencies:</strong>{" "}
                      <span className="text-slate-900 font-semibold">{entities.frequencies.join(", ")}</span>
                    </div>
                  )}
                  {entities.durations?.length > 0 && (
                    <div className="p-2 bg-white rounded border border-primary-200">
                      <strong className="text-primary-800">📅 Durations:</strong>{" "}
                      <span className="text-slate-900 font-semibold">{entities.durations.join(", ")}</span>
                    </div>
                  )}
                  {entities.warnings?.length > 0 && (
                    <div className="p-2 bg-amber-50 rounded border-2 border-amber-300">
                      <strong className="text-amber-900">⚠️ Warnings:</strong>{" "}
                      <span className="text-amber-800 font-semibold">{entities.warnings.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Instruction Section */}
        <div className="border-b border-slate-200 pb-6">
          <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🔊</span>
            Voice Instruction
          </h4>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900">
                Voice Note (what will be spoken) *
              </label>
              <VoiceInput
                onTranscript={(text) => {
                  setVoiceNote(prev => prev ? prev + " " + text : text);
                }}
              />
            </div>
            <textarea
              value={voiceNote}
              onChange={(e) => setVoiceNote(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
              rows={4}
              placeholder="Enter text that will be read aloud to worker in their selected language"
            />
          </div>
        </div>

        {/* Additional Details Section */}
        <div>
          <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-lg">📎</span>
            Additional Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Attachment (X-ray / report)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving…" : "Save Visit"}
        </Button>
      </form>
    </div>
  );
}
