// app/worker/visits/page.tsx - MIGRATED TO FIREBASE
"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser, getDocument } from "@/lib/firebase-helpers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useTranslation } from "@/app/providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  FileText,
  Search,
  Filter,
  User,
  ArrowRight
} from "lucide-react";
import { getRecords } from "@/utils/offline";
import { LANGUAGES } from "@/utils/language";
import Link from "next/link";

export default function WorkerVisitsPage() {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter logic
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredRecords(
        records.filter(
          (r) =>
            (r.diagnosis_simple || "").toLowerCase().includes(q) ||
            (r.diagnosis_raw || "").toLowerCase().includes(q) ||
            (r.prescription_note || "").toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, records]);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const uid = user?.uid;

      if (!uid) {
        window.location.href = "/login";
        return;
      }

      // Load Profile
      const p = await getDocument("users", uid);
      setProfile(p);

      // Load Records
      const recs = await getRecords(uid);
      setRecords(recs || []);
      setFilteredRecords(recs || []);
    } catch (error) {
      console.error("Error loading visits:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentLangLabel = LANGUAGES.find(l => l.code === (profile?.language || locale))?.label || "English";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/worker">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("visits_history")}</h1>
            <p className="text-slate-600 text-sm">
              {profile?.name} (Language: {currentLangLabel})
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </motion.div>

      {/* Visits List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {filteredRecords.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-900 font-bold text-lg">No visits found</h3>
            <p className="text-slate-500">You haven&apos;t visited any doctors yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRecords.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 group relative overflow-hidden">
                  <Link href={`/worker/record/${record.id}`} className="absolute inset-0 z-10" />
                  <CardContent className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
                    {/* Date Block */}
                    <div className="flex flex-col items-center justify-center bg-primary-50 text-primary-700 min-w-[80px] h-20 rounded-lg p-2 border border-primary-100">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {record.visit_date?.toDate?.() 
                          ? new Date(record.visit_date.toDate()).toLocaleString('default', { month: 'short' })
                          : new Date(record.visit_date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-bold leading-none my-1">
                        {record.visit_date?.toDate?.()
                          ? new Date(record.visit_date.toDate()).getDate()
                          : new Date(record.visit_date).getDate()}
                      </span>
                      <span className="text-xs font-semibold opacity-80">
                        {record.visit_date?.toDate?.()
                          ? new Date(record.visit_date.toDate()).getFullYear()
                          : new Date(record.visit_date).getFullYear()}
                      </span>
                    </div>

                    {/* Content Block */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-700 transition-colors">
                            {record.diagnosis_simple || record.diagnosis_raw || "General Visit"}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <User className="w-3.5 h-3.5" />
                            Dr. {record.doctor_name || "Unknown"}
                          </div>
                        </div>

                        {/* Severity & View Button */}
                        <div className="flex flex-col items-end gap-2">
                          <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1 text-primary-700 font-bold hover:bg-primary-50">
                            View Details <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>

                      {/* Tags / Info */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {record.severity && (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border ${record.severity === "high" ? "bg-red-50 text-red-700 border-red-100" :
                            record.severity === "medium" ? "bg-amber-50 text-amber-700 border-amber-100" :
                              "bg-green-50 text-green-700 border-green-100"
                            }`}>
                            {record.severity} Priority
                          </span>
                        )}

                        {record.attachments && record.attachments.length > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            📎 {record.attachments.length} Files
                          </span>
                        )}

                        {record.prescription_note && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            💊 Medicine Prescribed
                          </span>
                        )}
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
