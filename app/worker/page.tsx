// app/worker/page.tsx - MIGRATED TO FIREBASE
"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser, getDocument, queryCollection, updateDocument } from "@/lib/firebase-helpers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import WorkerQR from "@/components/WorkerQR";
import PrescriptionBox from "@/components/PrescriptionBox";
import ReportsList from "@/components/ReportsList";
import LogoutButton from "@/components/LogoutButton";
import AdherencePredictor from "@/components/AdherencePredictor";
import HealthAI from "@/components/HealthAI";
import CureMap from "@/components/CureMap";
import { useTranslation } from "@/app/providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { RefreshCw, User, QrCode } from "lucide-react";
import { LANGUAGES } from "@/utils/language";
import { Locale } from "@/utils/i18n";
import VisitDetailModal from "@/components/VisitDetailModal";

export default function WorkerDashboard() {
  const { t, locale, setLocale } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingIso, setSavingIso] = useState(false);

  // Modal State
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        const uid = user?.uid ?? null;
        if (isMounted) setUserId(uid);

        if (!uid) {
          if (isMounted) setLoading(false);
          return;
        }

        // Get user profile from Firestore
        const p = await getDocument("users", uid) as any;

        if (isMounted) {
          setProfile(p || {
            id: uid,
            name: user?.displayName || user?.email,
            email: user?.email
          });

          if (p?.language) {
            setLocale(p.language as Locale);
          }

          // Get records for this worker
          // NOTE: Removed orderBy to avoid missing index issues. Sorting in memory.
          const recordsQuery = query(
            collection(db, "records"),
            where("worker_id", "==", uid)
          );
          const recordsSnapshot = await getDocs(recordsQuery);

          const recs = recordsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })).sort((a: any, b: any) => {
            // Sort descending by visit_date
            const dateA = a.visit_date?.toDate ? a.visit_date.toDate() : new Date(a.visit_date);
            const dateB = b.visit_date?.toDate ? b.visit_date.toDate() : new Date(b.visit_date);
            return dateB.getTime() - dateA.getTime();
          });

          setRecords(recs);
        }
      } catch (err: any) {
        console.error("Error loading data:", err);
        if (isMounted) setError(err.message || "Failed to load data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []); // Removed dependency to prevent re-fetch loops

  const refresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const recordsQuery = query(
        collection(db, "records"),
        where("worker_id", "==", userId),
        orderBy("visit_date", "desc")
      );
      const recordsSnapshot = await getDocs(recordsQuery);
      const recs = recordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecords(recs);
    } catch (err) {
      console.error("Error refreshing:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    setSavingIso(true);
    try {
      await setLocale(newLang as Locale);
      if (userId) {
        // Update user preference in DB
        await updateDocument("users", userId, { language: newLang });
        setProfile((prev: any) => prev ? { ...prev, language: newLang } : null);
      }
    } catch (e) {
      console.error("Failed to save language preference", e);
    } finally {
      setSavingIso(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-slate-600">Loading your health dashboard...</div>
        </div>
      </div>
    );
  }

  const currentLang = profile?.language ?? locale;
  const latestRecord = records.length > 0 ? records[0] : null;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border-l-4 border-red-500 shadow-sm flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold">{t("error_loading_dashboard")}</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl shadow-lg text-white"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 text-3xl shadow-inner">
            {profile?.gender === 'female' ? '👩🏽' : '👨🏽'}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{profile?.name || t("your_health")}</h1>
            <div className="flex items-center gap-2 text-primary-100 text-sm font-medium">
              <span>ID: {profile?.id?.slice(0, 8)}...</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{t("worker_label")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <select
            value={currentLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={savingIso}
            className="bg-white/10 text-white font-bold border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-primary-800 focus:border-white transition-all cursor-pointer hover:bg-white/20"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                {l.label}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={refreshing}
            className="text-white hover:bg-white/20 rounded-full"
            title={t("refresh")}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <LogoutButton />
        </div>
      </motion.header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Health Card & QR */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-2 border-primary-200 shadow-strong bg-white">
              <CardHeader className="bg-gradient-to-r from-primary-50 to-white border-b border-primary-100 pb-4">
                <CardTitle className="text-primary-800 flex items-center gap-2 text-xl">
                  <QrCode className="w-6 h-6" />
                  {t("health_id_qr")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center">
                <div className="mb-4 text-center">
                  <div className="text-sm text-slate-500 font-medium mb-1">{t("health_id")}</div>
                  <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-lg font-mono font-bold text-primary-700 select-all border border-slate-200">
                    {profile?.id}
                  </code>
                </div>
                <WorkerQR profile={profile} />
              </CardContent>
            </Card>

            {/* SOS Button - Emergency Feature */}
            <div className="mt-6">
              <a
                href="tel:102"
                className="flex items-center justify-center gap-3 w-full p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-xl font-bold"
              >
                <span className="text-2xl animate-pulse">🆘</span>
                {t("emergency_call")}
              </a>
              <p className="text-center text-xs text-slate-500 mt-2 font-medium">
                {t("tap_ambulance")}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Prescription, Visits, Reports */}
        <div className="lg:col-span-8 space-y-8">

          {/* 1. Voice Twin / Prescription Box (Latest) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {latestRecord ? (
              <PrescriptionBox
                record={latestRecord}
                language={currentLang}
              />
            ) : (
              <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 text-center">
                <div className="text-4xl mb-3 opacity-50">📋</div>
                <h3 className="text-xl font-bold text-slate-700">{t("no_visits_recorded")}</h3>
                <p className="text-slate-500">{t("no_visits_desc")}</p>
              </div>
            )}
          </motion.section>

          {/* Cure Map Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <CureMap
              userId={userId || ""}
              recordId={latestRecord?.id}
              diagnosis={latestRecord?.diagnosis_simple || latestRecord?.diagnosis_raw || t("general_checkup")}
              language={currentLang}
            />
          </motion.section>

          {/* 2. Recent Visits List */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-2xl">📅</span>
                Recent Visits
              </h2>
            </div>

            {records.length > 0 ? (
              <div className="space-y-4">
                {records.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setSelectedVisit(rec);
                      setIsModalOpen(true);
                    }}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold text-primary-700 mb-1">
                        {new Intl.DateTimeFormat(currentLang, { dateStyle: 'full' }).format(new Date(rec.visit_date.toDate ? rec.visit_date.toDate() : rec.visit_date))}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {rec.diagnosis_simple || rec.diagnosis_raw || t("general_checkup")}
                      </h3>
                      {rec.doctor_name && (
                        <div className="text-sm text-slate-500 font-medium">
                          Dr. {rec.doctor_name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${rec.severity === 'high' ? 'bg-red-100 text-red-700' :
                        rec.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {rec.severity ? t(`severity_${rec.severity.toLowerCase()}`) || rec.severity : t("normal")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.section>

          {/* 3. Reports & Scans */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-2xl">📂</span>
                Reports & Scans
              </h2>
            </div>
            <ReportsList records={records} />
          </motion.section>

        </div>
      </div>

      {/* 4. Health AI (Floating Bubble) */}
      <HealthAI
        locale={currentLang}
        userId={userId}
        records={records}
        userName={profile?.name}
      />

      {/* 5. Visit Detail Modal */}
      <VisitDetailModal
        visit={selectedVisit}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        language={currentLang}
      />
    </div>
  );
}

function calculateAge(dob: string) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
