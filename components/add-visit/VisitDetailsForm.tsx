import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import FormInput from "../FormInput";
import VoiceInput from "../VoiceInput";

interface VisitDetailsFormProps {
  data: {
    diagnosisRaw: string;
    diagnosisSimple: string;
    prescription: string;
    voiceNote: string;
    severity: "low" | "medium" | "high";
    file: File | null;
  };
  onChange: (field: string, value: string | File | null) => void;
  onExtractEntities: () => void;
  extracting: boolean;
  entities: any;
}

export default function VisitDetailsForm({
  data,
  onChange,
  onExtractEntities,
  extracting,
  entities,
}: VisitDetailsFormProps) {
  return (
    <div className="border-t-2 border-zinc-200 pt-6">
      <h4 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <span>🏥</span>
        Visit Information
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormInput
          label="Diagnosis (Technical/Raw) *"
          name="diagnosisRaw"
          value={data.diagnosisRaw}
          onChange={(e) => onChange("diagnosisRaw", e.target.value)}
          placeholder="Enter diagnosis"
          required
        />

        <FormInput
          label="Diagnosis (Simple - for patient)"
          name="diagnosisSimple"
          value={data.diagnosisSimple}
          onChange={(e) => onChange("diagnosisSimple", e.target.value)}
          placeholder="Simple explanation"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-slate-900">
            Prescription (medicines) *
          </label>
          <div className="flex gap-2">
            <VoiceInput
              onTranscript={(text) => {
                // Append to current text
                onChange(
                  "prescription",
                  data.prescription ? data.prescription + " " + text : text
                );
              }}
              className="inline-block"
            />
            <button
              type="button"
              onClick={onExtractEntities}
              disabled={extracting || !data.prescription.trim()}
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
          value={data.prescription}
          onChange={(e) => onChange("prescription", e.target.value)}
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
            {Object.values(entities).some((arr: any) => arr.length > 0) ? (
              <div className="space-y-2 text-sm text-slate-800">
                {entities.medicines?.length > 0 && (
                  <div className="p-2 bg-white rounded border border-primary-200">
                    <strong className="text-primary-800">💊 Medicines:</strong>{" "}
                    <span className="text-slate-900 font-semibold">
                      {entities.medicines.join(", ")}
                    </span>
                  </div>
                )}
                {entities.dosages?.length > 0 && (
                  <div className="p-2 bg-white rounded border border-primary-200">
                    <strong className="text-primary-800">📊 Dosages:</strong>{" "}
                    <span className="text-slate-900 font-semibold">
                      {entities.dosages.join(", ")}
                    </span>
                  </div>
                )}
                {entities.frequencies?.length > 0 && (
                  <div className="p-2 bg-white rounded border border-primary-200">
                    <strong className="text-primary-800">⏰ Frequencies:</strong>{" "}
                    <span className="text-slate-900 font-semibold">
                      {entities.frequencies.join(", ")}
                    </span>
                  </div>
                )}
                {entities.durations?.length > 0 && (
                  <div className="p-2 bg-white rounded border border-primary-200">
                    <strong className="text-primary-800">📅 Durations:</strong>{" "}
                    <span className="text-slate-900 font-semibold">
                      {entities.durations.join(", ")}
                    </span>
                  </div>
                )}
                {entities.warnings?.length > 0 && (
                  <div className="p-2 bg-amber-50 rounded border-2 border-amber-300">
                    <strong className="text-amber-900">⚠️ Warnings:</strong>{" "}
                    <span className="text-amber-800 font-semibold">
                      {entities.warnings.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-white rounded border border-primary-200 text-slate-600 text-sm">
                ℹ️ No entities could be extracted from this text. Please continue manually.
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Voice Note (what will be spoken) *
          </label>
          <VoiceInput
            onTranscript={(text) => {
              onChange("voiceNote", data.voiceNote ? data.voiceNote + " " + text : text);
            }}
          />
        </div>
        <textarea
          value={data.voiceNote}
          onChange={(e) => onChange("voiceNote", e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
          rows={4}
          placeholder="Enter text that will be read aloud to worker in their selected language"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Attachment (X-ray / report)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => onChange("file", e.target.files?.[0] ?? null)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Severity *</label>
          <select
            value={data.severity}
            onChange={(e) => onChange("severity", e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </div>
  );
}
