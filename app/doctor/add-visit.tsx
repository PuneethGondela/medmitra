// app/doctor/add-visit.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useState } from "react";
import { getCurrentUser, insertDocument, uploadFile } from "../../lib/firebase-helpers";
import WorkerLookup from "../../components/WorkerLookup";
import { Timestamp } from "firebase/firestore";

export default function AddVisitPage() {
  const [workerId, setWorkerId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [diagnosisRaw, setDiagnosisRaw] = useState("");
  const [diagnosisSimple, setDiagnosisSimple] = useState("");
  const [prescription, setPrescription] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!workerId) return setMessage("Worker ID required.");
    if (!diagnosisRaw) return setMessage("Diagnosis required.");

    setLoading(true);

    try {
      const user = await getCurrentUser();
      const doctorId = user?.uid;
      if (!doctorId) throw new Error("Not authenticated");

      // Insert record using Firestore
      const recordData = {
        worker_id: workerId,
        doctor_id: doctorId,
        diagnosis_raw: diagnosisRaw,
        diagnosis_simple: diagnosisSimple || diagnosisRaw,
        prescription_note: prescription,
        voice_note: voiceNote,
        severity,
        visit_date: Timestamp.now(),
      };

      const recordId = await insertDocument("records", recordData);

      // Upload attachment if present
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `${workerId}/${fileName}`;

        const fileUrl = await uploadFile("health-files", filePath, file);

        await insertDocument("attachments", {
          record_id: recordId,
          file_path: filePath,
          file_url: fileUrl,
          file_type: "xray",
          description: diagnosisSimple || "Attachment",
        });
      }

      setMessage("✅ Data added successfully! Visit saved to database.");
      // clear form
      setWorkerId("");
      setWorkerName("");
      setDiagnosisRaw("");
      setDiagnosisSimple("");
      setPrescription("");
      setVoiceNote("");
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "Failed to save visit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl card bg-gradient-to-br from-white via-primary-50/40 to-accent-50/40 border-2 border-primary-200/50">
      <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">➕ Add Visit</h2>
      {message && (
        <div className={`mb-3 p-3 rounded-xl text-sm font-medium shadow-soft ${message.includes("success") 
          ? "bg-gradient-to-r from-accent-100 to-accent-50 text-accent-700 border-2 border-accent-300" 
          : "bg-gradient-to-r from-danger-100 to-danger-50 text-danger-700 border-2 border-danger-300"}`}>
          {message.includes("success") ? "✅ " : "❌ "}{message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="block">
          <div className="text-sm mb-1.5 font-medium text-gray-700">Select Worker</div>
          {workerId ? (
            <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <div>
                <div className="font-medium text-primary-900">{workerName}</div>
                <div className="text-xs text-primary-600">ID: {workerId.slice(0, 8)}...</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWorkerId("");
                  setWorkerName("");
                }}
                className="px-3 py-1 text-sm text-primary-700 hover:text-primary-900"
              >
                Change
              </button>
            </div>
          ) : (
            <WorkerLookup
              onSelect={(id, name) => {
                setWorkerId(id);
                setWorkerName(name);
              }}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-sm mb-1.5 font-medium text-gray-700">Diagnosis (raw)</div>
            <input value={diagnosisRaw} onChange={(e) => setDiagnosisRaw(e.target.value)} className="input-field" />
          </label>

          <label className="block">
            <div className="text-sm mb-1.5 font-medium text-gray-700">Diagnosis (simple / spoken)</div>
            <input value={diagnosisSimple} onChange={(e) => setDiagnosisSimple(e.target.value)} className="input-field" />
          </label>
        </div>

        <label className="block">
          <div className="text-sm mb-1.5 font-medium text-gray-700">Prescription</div>
          <input value={prescription} onChange={(e) => setPrescription(e.target.value)} className="input-field" />
        </label>

        <label className="block">
          <div className="text-sm mb-1.5 font-medium text-gray-700">Voice Note (what will be spoken)</div>
          <textarea value={voiceNote} onChange={(e) => setVoiceNote(e.target.value)} className="input-field" rows={3} />
        </label>

        <div className="flex items-center gap-4">
          <label className="block flex-1">
            <div className="text-sm mb-1.5 font-medium text-gray-700">Attachment (X-ray / report)</div>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input-field" />
          </label>

          <label className="block">
            <div className="text-sm mb-1.5 font-medium text-gray-700">Severity</div>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="input-field">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <button className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save Visit"}</button>
        </div>
      </form>
    </div>
  );
}
