"use client";
import React, { useEffect, useState } from "react";
import { HealthPlan, getHealthPlan } from "../lib/health-plan-service";
import { Loader2, Calendar, Utensils, Activity, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslation } from "@/app/providers";

interface CureMapProps {
    userId: string;
    recordId?: string; // If provided, looks for a plan for this specific visit
    diagnosis: string;
    language?: string;
}

export default function CureMap({ userId, recordId, diagnosis, language = "en-IN" }: CureMapProps) {
    const { t } = useTranslation();
    const [plan, setPlan] = useState<HealthPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Fetch
    useEffect(() => {
        let mounted = true;
        async function fetchPlan() {
            setLoading(true);
            try {
                const existingPlan = await getHealthPlan(userId, recordId);
                if (mounted) {
                    setPlan(existingPlan as HealthPlan);

                    // Auto-generate if not found and diagnosis implies need (e.g. Pregnancy, or just always for new system)
                    // For this sprint: Auto-generate if missing.
                    if (!existingPlan && recordId && !generating) {
                        handleGenerate();
                    }
                }
            } catch (err) {
                console.error("Error loading health plan:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchPlan();
        return () => { mounted = false; };
    }, [userId, recordId]);

    const handleGenerate = async () => {
        if (generating) return;
        setGenerating(true);
        setError(null);

        try {
            // Call API
            const token = await (await import("../lib/firebase-auth-helpers")).getCurrentUser().then(u => u?.getIdToken());
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/generate-health-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    recordId,
                    language
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");

            // Fetch again or use returned data
            setPlan(data.plan);

        } catch (err: any) {
            console.error("Generation error:", err);
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    if (loading && !plan) {
        return (
            <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
                <p className="text-slate-600 font-semibold">{t("checking_health_plan")}</p>
            </div>
        );
    }

    if (generating) {
        return (
            <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-primary-600 animate-spin-slow" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t("creating_cure_map")}</h3>
                <p className="text-slate-600 max-w-sm">
                    Our AI is designing a personalized health journey for <strong>{diagnosis}</strong> based on ancient wisdom and modern science.
                </p>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="glass-card p-6 text-center">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t("no_health_plan")}</h3>
                <p className="text-slate-600 mb-4">Would you like to generate a detailed care plan for {diagnosis}?</p>
                <button
                    onClick={handleGenerate}
                    className="btn-primary px-6 py-2"
                >
                    {t("generate_cure_map")}
                </button>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                    <h2 className="text-xl md:text-2xl font-bold">Your Cure Map: {plan.diagnosis}</h2>
                </div>
                <p className="opacity-90">{plan.overview}</p>
            </div>

            <div className="p-6 space-y-8">
                {/* Timeline / Schedule */}
                <section>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        {t("care_schedule")}
                    </h3>
                    <div className="space-y-4">
                        {plan.schedule?.length ? plan.schedule.map((step, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center font-bold text-primary-700 border-2 border-primary-200">
                                    W{step.week}
                                </div>
                                <div className="flex-1 pb-4 border-l-2 border-slate-100 pl-6 -ml-6 md:border-l-0 md:pl-0">
                                    <h4 className="font-bold text-slate-800">{step.title}</h4>
                                    <ul className="mt-2 space-y-1">
                                        {step.activities?.length ? step.activities.map((act, i) => (
                                            <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                                                <span className="text-primary-500 mt-1">•</span>
                                                {act}
                                            </li>
                                        )) : null}
                                    </ul>
                                    {step.upcomingVisit && (
                                        <div className="mt-3 bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>{t("next_visit")}: <strong>{step.upcomingVisit.suggestedDate}</strong> ({step.upcomingVisit.reason})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-slate-500 italic">
                                No schedule available.
                            </div>
                        )}
                    </div>
                </section>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Diet */}
                    <section>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">
                            <Utensils className="w-5 h-5 text-orange-500" />
                            {t("diet_plan")}
                        </h3>
                        <div className="space-y-4">
                            {plan.diet?.length ? plan.diet.map((d, idx) => (
                                <div key={idx} className="bg-orange-50/50 rounded-lg p-4 border border-orange-100">
                                    <h4 className="font-bold text-orange-800 mb-2">{d.category}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {d.items?.length ? d.items.map((item, i) => (
                                            <span key={i} className="px-2 py-1 bg-white text-slate-700 text-sm rounded shadow-sm border border-orange-200">
                                                {item}
                                            </span>
                                        )) : <span className="text-slate-400 text-xs">{t("no_items")}</span>}
                                    </div>
                                </div>
                            )) : <p className="text-slate-500 italic">No diet plan available.</p>}
                        </div>
                    </section>

                    {/* Exercises & Safety */}
                    <div className="space-y-8">
                        <section>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">
                                <Activity className="w-5 h-5 text-blue-500" />
                                {t("exercises")}
                            </h3>
                            <ul className="space-y-3">
                                {plan.exercises?.length ? plan.exercises.map((ex, idx) => (
                                    <li key={idx} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-800">{ex.name}</div>
                                            <div className="text-xs text-slate-500">{ex.duration} • {ex.frequency}</div>
                                        </div>
                                    </li>
                                )) : <li className="text-slate-500 italic">No exercises listed.</li>}
                            </ul>
                        </section>

                        <section>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-red-900 mb-4 border-b border-red-200 pb-2">
                                <ShieldAlert className="w-5 h-5 text-red-600" />
                                {t("safety_precautions")}
                            </h3>
                            <ul className="space-y-2">
                                {plan.safety_precautions?.length ? plan.safety_precautions.map((safe, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-red-50 p-2 rounded border border-red-100">
                                        <span className="text-red-500 font-bold">!</span>
                                        {safe}
                                    </li>
                                )) : <li className="text-slate-500 italic">No safety precautions listed.</li>}
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
