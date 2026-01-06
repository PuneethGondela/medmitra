// app/doctor/page.tsx - MIGRATED TO FIREBASE
"use client";

import React, { useEffect, useState, useRef } from "react";
import { getCurrentUser, queryCollection, getDocument } from "../../lib/firebase-helpers";
import { db, auth } from "../../lib/firebase";
import { collection, query, where, getDocs, limit, orderBy, Timestamp } from "firebase/firestore";
import DoctorScanner from "../../components/DoctorScanner";
import AddVisitExisting from "../../components/AddVisitExisting";
import AddVisitNew from "../../components/AddVisitNew";
import WorkerDetailModal from "../../components/WorkerDetailModal";
import WorkerLookup from "../../components/WorkerLookup";
import Link from "next/link";
import LogoutButton from "../../components/LogoutButton";
import MedMitraChat from "../../components/MedMitraChat";
import { useTranslation } from "@/app/providers";
import { LANGUAGES } from "../../utils/language";

export default function DoctorDashboard() {
  const { t, locale, setLocale } = useTranslation();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [worker, setWorker] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"none" | "scan" | "existing" | "new" | "all-visits">("none");
  const [recent, setRecent] = useState<any[]>([]);
  const [stats, setStats] = useState({ today: 0, total: 0 });
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [allowWrite, setAllowWrite] = useState(false);
  const [allVisits, setAllVisits] = useState<any[]>([]); // New state for all visits
  const [loadingVisits, setLoadingVisits] = useState(false); // New state loading

  // ... (keeping existing useEffects)

  async function loadAllVisits() {
    if (!doctorId) return;
    setLoadingVisits(true);
    try {
      // Index-safe query: Remove orderBy from Firestore query
      const q = query(
        collection(db, "records"),
        where("doctor_id", "==", doctorId),
        limit(100)
      );
      const snap = await getDocs(q);
      const recs = await Promise.all(
        snap.docs.map(async (d) => {
          const rec = d.data() as any;
          let workerName = "Unknown";
          if (rec.worker_id) {
            const w = await getDocument("users", rec.worker_id) as any;
            if (w) workerName = w.name;
          }
          return { id: d.id, ...rec, worker: { name: workerName } };
        })
      );

      // Sort client-side
      recs.sort((a: any, b: any) => {
        const dateA = a.visit_date?.toDate ? a.visit_date.toDate() : new Date(a.visit_date);
        const dateB = b.visit_date?.toDate ? b.visit_date.toDate() : new Date(b.visit_date);
        return dateB.getTime() - dateA.getTime();
      });

      setAllVisits(recs);
    } catch (err) {
      console.error("Error loading all visits", err);
    } finally {
      setLoadingVisits(false);
    }
  }

  useEffect(() => {
    if (mode === "all-visits") {
      loadAllVisits();
    }
  }, [mode, doctorId]);

  async function loadData() {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setDoctorId(user.uid);

      // Get recent records for this doctor
      // Get recent records for this doctor (Index-safe: client-side sort)
      const q = query(
        collection(db, "records"),
        where("doctor_id", "==", user.uid),
        limit(20)
      );
      const snap = await getDocs(q);
      const recs = await Promise.all(
        snap.docs.map(async (d) => {
          const rec = d.data() as any;
          let workerName = "Unknown";
          if (rec.worker_id) {
            const w = await getDocument("users", rec.worker_id) as any;
            if (w) workerName = w.name;
          }
          return { id: d.id, ...rec, worker: { name: workerName } };
        })
      );

      // Sort client-side
      recs.sort((a: any, b: any) => {
        const dateA = a.visit_date?.toDate ? a.visit_date.toDate() : new Date(a.visit_date);
        const dateB = b.visit_date?.toDate ? b.visit_date.toDate() : new Date(b.visit_date);
        return dateB.getTime() - dateA.getTime();
      });

      setRecent(recs.slice(0, 10));

      setStats(prev => ({
        ...prev, today: recs.filter((r: any) => {
          const date = r.visit_date?.toDate ? r.visit_date.toDate() : new Date(r.visit_date);
          const today = new Date();
          return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
        }).length
      }));

    } catch (err) {
      console.error("Error loading data", err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setAllowWrite(false); // Search = Read Only

    try {
      // Try exact ID match first
      const exactMatch = await getDocument("users", query.trim());
      if (exactMatch && (exactMatch as any).role === "worker") {
        setWorker(exactMatch);
        setShowModal(true);
        setMode("existing");
        setQuery("");
        return;
      }

      // Try partial search (Firestore has limited search, so we filter client-side)
      const workersQuery = query(
        collection(db, "users"),
        where("role", "==", "worker"),
        limit(100)
      );
      const workersSnapshot = await getDocs(workersQuery);
      const searchTerm = query.toLowerCase();
      const matches = workersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (w: any) =>
            w.id?.toLowerCase().includes(searchTerm) ||
            w.name?.toLowerCase().includes(searchTerm) ||
            w.phone?.includes(searchTerm)
        )
        .slice(0, 5);

      if (matches.length > 0) {
        if (matches.length === 1) {
          setWorker(matches[0]);
          setShowModal(true);
          setMode("existing");
        } else {
          setWorker(matches[0]);
          setShowModal(true);
          setMode("existing");
        }
        setQuery("");
      } else {
        alert("Worker not found. To create a new worker/visit, please use 'New Worker' button or Scan QR.");
        setMode("none");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }

  function openScanner() {
    setMode("scan");
  }

  function onScannedWorker(w: any) {
    setWorker(w);
    setAllowWrite(true); // Scanned = Write Access
    setShowModal(true);
    setMode("existing");
  }

  async function handleWorkerSelect(id: string, name: string) {
    const data = await getDocument("users", id);
    if (data) {
      setWorker(data);
      setAllowWrite(false); // Selected from lookup/list = Read Only
      setShowModal(true);
      setMode("existing");
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Premium Side Nav */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <div className="glass-card space-y-2 p-4">
          <button
            onClick={() => setMode("none")}
            className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-lg shadow-md transition-all duration-200 ${mode === 'none' ? 'bg-primary-700 text-white shadow-lg' : 'bg-white text-slate-800 hover:bg-slate-100 hover:shadow-sm'}`}
          >
            <span className="text-xl">🏠</span>
            <span>Overview</span>
          </button>
          <button
            onClick={() => setMode("all-visits")}
            className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-lg transition-all duration-200 border-2 border-transparent ${mode === 'all-visits' ? 'bg-primary-700 text-white' : 'bg-white text-slate-800 hover:bg-slate-100 hover:shadow-sm hover:border-slate-300'}`}
          >
            <span>📋</span>
            <span>All Visits</span>
          </button>
          <button
            onClick={openScanner}
            className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-lg transition-all duration-200 border-2 border-transparent ${mode === 'scan' ? 'bg-primary-700 text-white' : 'bg-white text-slate-800 hover:bg-slate-100 hover:shadow-sm hover:border-slate-300'}`}
          >
            <span>➕</span>
            <span>Add Visit</span>
          </button>
          <button
            onClick={() => {
              setMode("new");
              setAllowWrite(true);
              setWorker(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-lg transition-all duration-200 border-2 border-transparent ${mode === 'new' ? 'bg-primary-700 text-white' : 'bg-white text-slate-800 hover:bg-slate-100 hover:shadow-sm hover:border-slate-300'}`}
          >
            <span>👤</span>
            <span>Create Worker</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 space-y-6">
        {/* Premium Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 md:p-8 rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-lg border border-primary-500/30">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="text-3xl filter drop-shadow-md">👨‍⚕️</span>
              <span className="drop-shadow-sm">Doctor Dashboard</span>
            </h1>
            <p className="text-sm md:text-base text-white/90 font-medium">
              {stats.today} visits today • {stats.total} total
            </p>
          </div>
          <div className="flex items-center gap-3">

            <LogoutButton />
          </div>
        </header>

        {/* Premium Top bar: Search + Actions */}
        <div className="glass-card p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Search Worker by Health ID / Phone / Name
              </label>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Health ID, name, or phone number... (Press '/' to focus)"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-md transition-all px-6 py-3"
                disabled={searching}
              >
                {searching ? "Searching..." : "🔍 Search"}
              </button>
              <button
                type="button"
                onClick={openScanner}
                className="btn-secondary px-6 py-3"
              >
                📷 Scan QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("new");
                  setAllowWrite(true); // Creating new always implies write access
                  setWorker(null);
                }}
                className="btn-primary px-6 py-3"
              >
                ➕ New Worker
              </button>
            </div>
          </form>
          {/* Removed duplicate WorkerLookup search input as requested */}
        </div>

        {/* Scanner area */}
        {mode === "scan" && (
          <div className="flex justify-center">
            <div className="w-full max-w-lg border-4 border-primary-500 rounded-xl overflow-hidden shadow-2xl">
              <DoctorScanner
                onResult={async (payload) => {
                  try {
                    const parsed =
                      typeof payload === "string" ? JSON.parse(payload) : payload;
                    const uid = parsed.id;

                    const data = await getDocument("users", uid);
                    if (data && data.role === "worker") {
                      onScannedWorker(data);
                      setMode("none");
                    } else {
                      setWorker({ id: uid, name: parsed.name });
                      setAllowWrite(true);
                      setMode("new");
                    }
                  } catch (err) {
                    console.error("Invalid QR payload", err);
                    alert("Scanned QR is invalid.");
                    setMode("none");
                  }
                }}
                onCancel={() => setMode("none")}
              />
            </div>
          </div>
        )}

        {/* Premium Quick card for found worker */}
        {worker && mode === "existing" && !showModal && (
          <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Health ID</div>
                <div className="font-mono font-bold text-xl text-primary-700 mb-3">
                  {worker.id?.slice(0, 8)}...
                </div>
                <div className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  {worker.name || "No name"}
                </div>
                <div className="text-sm md:text-base text-slate-700 font-semibold">
                  Language: {worker.language ?? "hi-IN"} • Phone: {worker.phone || "—"}
                </div>
                {!allowWrite && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                    <span>🔒</span> Read Only (Scan QR to Add Visit)
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-md transition-all px-6 py-3"
                  onClick={() => setShowModal(true)}
                >
                  👁️ View Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two-column area: forms / recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Add visit for existing worker */}
            {mode === "existing" && worker && allowWrite && (
              <AddVisitExisting
                worker={worker}
                onSaved={(r) => {
                  loadData(); // Refresh recent list
                  setMode("none");
                }}
              />
            )}

            {/* Create new worker + add visit */}
            {mode === "new" && allowWrite && (
              <AddVisitNew
                prefill={worker}
                onCreated={(w, r) => {
                  setWorker(w);
                  setMode("existing");
                  setAllowWrite(true);
                  loadData();
                }}
              />
            )}

            {mode === "none" && (
              <div className="glass-card text-center py-16 px-6">
                <div className="text-7xl mb-6">👨‍⚕️</div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                  Ready to add a visit?
                </h3>
                <p className="text-lg text-slate-700 font-semibold mb-6 max-w-md mx-auto">
                  Search for a worker to view profile, scan their QR code to add a visit, or create a new worker.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {/* Recent Patients */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-primary-700 mb-4 text-lg flex items-center gap-2">
                <span className="text-xl">👥</span>
                Recent Patients
              </h3>
              {recent.length === 0 ? (
                <div className="text-base text-slate-600 font-semibold text-center py-4">No recent visits</div>
              ) : (
                <ul className="space-y-3">
                  {recent.map((r: any, idx: number) => (
                    <li key={idx}>
                      <button
                        className="w-full text-left p-4 rounded-xl hover:bg-white/80 hover:shadow-soft transition-all duration-300 border-2 border-transparent hover:border-primary-200"
                        onClick={async () => {
                          const data = await getDocument("users", r.worker_id);
                          if (data) {
                            setWorker(data);
                            setMode("existing");
                            setAllowWrite(false); // Recent list click = Read Only by default
                            setShowModal(true);
                          }
                        }}
                      >
                        <div className="font-bold text-sm md:text-base text-slate-900 mb-1">
                          {r.worker?.name || r.worker_id?.slice(0, 8)}
                        </div>
                        <div className="text-xs md:text-sm text-slate-700 font-semibold">
                          {r.diagnosis_simple || "Visit"} •{" "}
                          {r.visit_date?.toDate?.()
                            ? new Date(r.visit_date.toDate()).toLocaleDateString()
                            : new Date(r.visit_date).toLocaleDateString()}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick Tips */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-accent-700 mb-4 text-lg flex items-center gap-2">
                <span className="text-xl">💡</span>
                Quick Tips
              </h3>
              <ul className="text-sm md:text-base text-slate-800 space-y-3 font-semibold">
                <li className="flex items-start gap-3">
                  <span className="text-lg">📷</span>
                  <span>Scan QR to <strong>Edit/Add Visit</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-lg">🔍</span>
                  <span>Search is <strong>Read-Only</strong></span>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        {/* All Visits List (Full Width) */}
        {mode === "all-visits" && (
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              All Visits
            </h3>

            {loadingVisits ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-slate-600 font-medium">Loading visits...</p>
              </div>
            ) : allVisits.length === 0 ? (
              <div className="text-center py-10 text-slate-600 font-medium">No visits found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="py-3 px-4 font-bold text-slate-700">Patient</th>
                      <th className="py-3 px-4 font-bold text-slate-700">Date</th>
                      <th className="py-3 px-4 font-bold text-slate-700">Diagnosis</th>
                      <th className="py-3 px-4 font-bold text-slate-700">Severity</th>
                      <th className="py-3 px-4 font-bold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVisits.map((visit) => (
                      <tr key={visit.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {visit.worker?.name || visit.worker_id?.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {visit.visit_date?.toDate?.()
                            ? new Date(visit.visit_date.toDate()).toLocaleDateString()
                            : new Date(visit.visit_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {visit.diagnosis_simple || visit.diagnosis_raw}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${visit.severity === 'high' ? 'bg-red-100 text-red-700' :
                            visit.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                            {visit.severity || 'low'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={async () => {
                              const data = await getDocument("users", visit.worker_id);
                              if (data) {
                                setWorker(data);
                                setMode("existing");
                                setAllowWrite(false);
                                setShowModal(true);
                              }
                            }}
                            className="text-primary-600 hover:text-primary-800 font-bold text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Worker modal */}
      {showModal && worker && (
        <WorkerDetailModal
          worker={worker}
          allowWrite={allowWrite}
          onCloseAction={() => {
            setShowModal(false);
            setMode("none");
          }}
          onAddVisitAction={() => {
            setShowModal(false);
            setMode("existing");
          }}
        />
      )}

      {/* Med Mitra Chat Widget */}
      <MedMitraChat />
    </div>
  );
}
