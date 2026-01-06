// components/PrescriptionBox.tsx
"use client";
import React, { useState, useEffect } from "react";
import { LANGUAGES } from "../utils/language";
import { translateText, extractMedicalInfo, NERResult } from "@/lib/ml-client";
import { useTranslation } from "../app/providers";
import VoiceButton from "./ui/VoiceButton";
import { Pill, Activity, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

// Helper to convert locale code (hi-IN) to language code (hi)
function localeToLangCode(locale: string): string {
  return locale.split("-")[0];
}

export default function PrescriptionBox({
  record,
  language
}: {
  record: any | null;
  language: string;
}) {
  const { t } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>("");
  const [translating, setTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [nerData, setNerData] = useState<NERResult | null>(null);
  const [loadingNer, setLoadingNer] = useState(false);

  // Separate prescription text (medicines) and voice note (what gets spoken)
  const prescriptionText = record?.prescription_note || "No prescription available.";

  // Has prescription if either field exists
  const hasPrescription = !!(record?.prescription_note || record?.voice_note);

  // Text to speak: prefer voice_note, fallback to prescription_note
  const textToSpeak = record?.voice_note || record?.prescription_note || "";

  // Auto-translate and extract NER when record changes
  useEffect(() => {
    if (hasPrescription && record?.prescription_note) {
      handleNer();
    }
    if (language !== "en-IN" && textToSpeak && hasPrescription) {
      handleTranslate();
    } else {
      setShowTranslated(false);
      setTranslatedText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, textToSpeak, record?.id]);

  const handleNer = async () => {
    if (!record?.prescription_note) return;
    setLoadingNer(true);
    try {
      const result = await extractMedicalInfo(record.prescription_note);
      setNerData(result);
    } catch (err) {
      console.error("NER failed", err);
    } finally {
      setLoadingNer(false);
    }
  };

  const handleTranslate = async () => {
    if (!textToSpeak || language === "en-IN") {
      setShowTranslated(false);
      setTranslatedText("");
      return;
    }

    setTranslating(true);
    setShowTranslated(false);
    try {
      // Convert locale code (hi-IN) to language code (hi)
      const langCode = localeToLangCode(language);
      console.log(`Translating from en to ${langCode} (locale: ${language})`);

      const result = await translateText(textToSpeak, langCode, "en", true);

      if (result.error) {
        console.error("Translation error:", result.error);
        setShowTranslated(false);
        setTranslatedText("");
      } else if (result.translation && result.translation !== textToSpeak) {
        setTranslatedText(result.translation);
        setShowTranslated(true);
      } else {
        setShowTranslated(false);
        setTranslatedText("");
      }
    } catch (error: any) {
      console.error("Translation failed:", error);
      setShowTranslated(false);
      setTranslatedText("");
    } finally {
      setTranslating(false);
    }
  };

  // VOICE TWIN LOGIC: Speak the TRANSLATED text if available
  const textToSpeakFinal = (showTranslated && translatedText) ? translatedText : textToSpeak;
  // Convert locale (hi-IN) to simple code (hi) for useVoice hook mapping
  const voiceLangCode = localeToLangCode(language);

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-xl">💊</span>
            </div>
            <h3 className="font-bold text-slate-900 text-xl">{t("prescription")}</h3>
          </div>
          {hasPrescription ? (
            <div className="space-y-4">
              {/* Prescription Text (Medicines) */}
              {record?.prescription_note && (
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">{t("medicines")}</div>

                  {/* NER Extracted Medicines Display */}
                  {nerData && nerData.medicines.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {nerData.medicines.map((med, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-accent-50 border-2 border-accent-200 p-3 rounded-xl flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-accent-600 shadow-sm">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{med.name}</div>
                            <div className="text-xs font-semibold text-slate-600">
                              {med.dosage || "1 Tab"} • {med.frequency || "BD"}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-base md:text-lg text-slate-900 font-semibold bg-white p-5 rounded-lg border-2 border-slate-300 leading-relaxed whitespace-pre-wrap mb-4">
                      {prescriptionText}
                    </div>
                  )}
                </div>
              )}

              {/* Instructions and Translations */}
              {showTranslated && translatedText ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {t("translated")} ({LANGUAGES.find(l => l.code === language)?.label})
                  </div>
                  <div className="text-base md:text-lg text-slate-900 font-semibold bg-primary-50 p-5 rounded-lg border-2 border-primary-300 leading-relaxed whitespace-pre-wrap shadow-sm">
                    {translatedText}
                  </div>
                </div>
              ) : (
                /* Original Instructions if no translation active */
                record?.voice_note && record.voice_note !== record.prescription_note && (
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">{t("instructions")}</div>
                    <div className="text-base md:text-lg text-slate-800 font-semibold bg-white p-4 rounded-lg border-2 border-slate-300 italic leading-relaxed whitespace-pre-wrap">
                      {record.voice_note}
                    </div>
                  </div>
                )
              )}

              {/* Translation Loading */}
              {translating && (
                <div className="text-sm text-slate-600 font-semibold italic flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                  {t("translating_to", { lang: LANGUAGES.find(l => l.code === language)?.label || language })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-base text-slate-600 italic bg-slate-50 p-4 rounded-lg border-2 border-slate-300 font-medium">{t("no_prescription")}</div>
          )}
        </div>
      </div>

      {/* Footer Actions: Language Display (Read-Only) + Speak Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t-2 border-slate-300">
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
          <span className="text-sm font-bold text-slate-600 uppercase">{t("language")}:</span>
          <span className="text-sm font-bold text-slate-900">
            {LANGUAGES.find(l => l.code === language)?.label || language}
          </span>
        </div>

        {/* Voice Button Integration */}
        {hasPrescription && textToSpeakFinal && (
          <VoiceButton
            text={textToSpeakFinal}
            language={language} // Pass the full locale (e.g. te-IN) so VoiceButton can find the specific voice
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold text-base shadow-md hover:shadow-lg active:scale-95"
          />
        )}
      </div>

      {record && (
        <div className="mt-4 text-sm text-slate-600 font-semibold text-center sm:text-left">
          {(() => {
            try {
              const date = record.visit_date ? new Date(record.visit_date) : new Date();
              if (isNaN(date.getTime())) return null; // Invalid date
              return (
                <>{t("visit_date")}: {new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(date)}</>
              );
            } catch (e) {
              return null;
            }
          })()}
        </div>
      )}
    </div>
  );
}

