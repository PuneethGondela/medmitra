import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Calendar, User, FileText, Pill, Activity, Languages } from "lucide-react";
import { useTranslation } from "@/app/providers"; // Import hook
import { translateText } from "@/lib/ml-client";
import { Loader2 } from "lucide-react";

interface VisitDetailModalProps {
    visit: any | null; // using any for flexibility with record types
    isOpen: boolean;
    onClose: () => void;
    language: string;
}

export default function VisitDetailModal({
    visit,
    isOpen,
    onClose,
    language,
}: VisitDetailModalProps) {
    const { t } = useTranslation();
    const [translatedData, setTranslatedData] = useState<any>({});
    const [isTranslating, setIsTranslating] = useState(false);

    // Reset translation when visit changes
    useEffect(() => {
        setTranslatedData({});
    }, [visit]);

    // Handle Translation
    useEffect(() => {
        const translateContent = async () => {
            if (!visit || language === 'en-IN') return;

            setIsTranslating(true);
            try {
                const targetLang = language.split('-')[0];
                const translations: any = {};

                // Translate Diagnosis
                const diagnosis = visit.diagnosis_simple || visit.diagnosis_raw || "General Checkup";
                const diagRes = await translateText(diagnosis, targetLang);
                if (diagRes.translation) translations.diagnosis = diagRes.translation;

                // Translate Instructions
                if (visit.voice_note) {
                    const noteRes = await translateText(visit.voice_note, targetLang);
                    if (noteRes.translation) translations.voice_note = noteRes.translation;
                }

                // Translate Prescription Text
                if (visit.prescription_text) {
                    const rxRes = await translateText(visit.prescription_text, targetLang);
                    if (rxRes.translation) translations.prescription_text = rxRes.translation;
                }
                // Translate Prescription Note
                if (visit.prescription_note) {
                    const rxNoteRes = await translateText(visit.prescription_note, targetLang);
                    if (rxNoteRes.translation) translations.prescription_note = rxNoteRes.translation;
                }

                setTranslatedData(translations);
            } catch (error) {
                console.error("Translation failed in modal:", error);
            } finally {
                setIsTranslating(false);
            }
        };

        if (isOpen) {
            translateContent();
        }
    }, [visit, language, isOpen]);


    if (!visit) return null;

    const date = visit.visit_date
        ? new Date(
            visit.visit_date.toDate
                ? visit.visit_date.toDate()
                : visit.visit_date
        )
        : new Date();

    const displayDiagnosis = translatedData.diagnosis || visit.diagnosis_simple || visit.diagnosis_raw || t("general_checkup");
    const displayInstructions = translatedData.voice_note || visit.voice_note;
    const displayPrescription = translatedData.prescription_text || visit.prescription_text;
    const displayPrescriptionNote = translatedData.prescription_note || visit.prescription_note;


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                <span>
                                    {displayDiagnosis}
                                </span>
                                {visit.severity && (
                                    <span
                                        className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold shadow-sm ${visit.severity === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                                            visit.severity === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                'bg-green-100 text-green-700 border border-green-200'
                                            }`}
                                    >
                                        {visit.severity ? t(`severity_${visit.severity.toLowerCase()}`) || visit.severity : t("normal")}
                                    </span>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 font-medium">
                                <span className="flex items-center gap-2 bg-slate-100/50 px-3 py-1 rounded-lg">
                                    <Calendar className="w-4 h-4 text-primary-600" />
                                    {new Intl.DateTimeFormat(language, {
                                        dateStyle: "full",
                                        timeStyle: "short",
                                    }).format(date)}
                                </span>
                                <span className="flex items-center gap-2 bg-slate-100/50 px-3 py-1 rounded-lg">
                                    <User className="w-4 h-4 text-primary-600" />
                                    Dr. {visit.doctor_name || t("unknown_doctor")}
                                </span>
                                {isTranslating && (
                                    <span className="flex items-center gap-2 text-primary-600 animate-pulse text-xs bg-primary-50 px-2 py-1 rounded-full">
                                        <Languages className="w-3 h-3" />
                                        Translating...
                                    </span>
                                )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-6">
                    {/* Instructions / Voice Note */}
                    {visit.voice_note && (
                        <section className="bg-white/60 p-5 rounded-2xl border border-white/40 shadow-sm relative overflow-hidden group hover:bg-white/80 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FileText className="w-24 h-24" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-600" /> {t("instructions")}
                            </h3>
                            <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-lg">
                                {displayInstructions}
                            </div>
                        </section>
                    )}

                    {/* Medicines / Prescription */}
                    {displayPrescription ? (
                        <section className="bg-white/60 p-5 rounded-2xl border border-white/40 shadow-sm relative overflow-hidden group hover:bg-white/80 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Pill className="w-24 h-24" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Pill className="w-5 h-5 text-purple-600" /> {t("medicines")}
                            </h3>
                            <div className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium text-lg">
                                {displayPrescription}
                            </div>
                        </section>
                    ) : displayPrescriptionNote ? (
                        <section className="bg-white/60 p-5 rounded-2xl border border-white/40 shadow-sm relative overflow-hidden group hover:bg-white/80 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Pill className="w-24 h-24" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Pill className="w-5 h-5 text-purple-600" /> {t("prescription_note")}
                            </h3>
                            <div className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium text-lg">
                                {displayPrescriptionNote}
                            </div>
                        </section>
                    ) : null}

                    {/* Vitals */}
                    {visit.vitals && (
                        <section className="bg-slate-50/50 p-5 rounded-2xl border border-white/40 shadow-inner">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-rose-500" /> {t("vitals")}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Object.entries(visit.vitals).map(([key, value]: [string, any]) => (
                                    <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">{key}</div>
                                        <div className="font-bold text-2xl text-slate-900">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>

                <div className="flex justify-end pt-2">
                    <Button onClick={onClose} variant="secondary" className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-6">
                        {t("close")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
