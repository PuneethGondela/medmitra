// components/WorkerDetailModal.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useEffect, useState } from "react";
import { queryCollection } from "../lib/firebase-helpers";
import { Button } from "./ui/button";
import Link from "next/link";

export default function WorkerDetailModal({
  worker,
  onCloseAction,
  onAddVisitAction,
  allowWrite = false,
}: {
  worker: any;
  onCloseAction: () => void;
  onAddVisitAction: () => void;
  allowWrite?: boolean;
}) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await queryCollection(
          "records",
          [{ field: "worker_id", operator: "==", value: worker.id }],
          "visit_date",
          "desc",
          10
        );

        if (isMounted) setRecords(data);
      } catch (err) {
        console.error("Error loading worker data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [worker]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseAction();
      }}
    >
      <div className="bg-white w-full max-w-3xl shadow-2xl my-8 border-2 border-slate-300 p-6 md:p-8 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b-2 border-slate-300">
          <div className="flex-1">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              {worker.name || "Worker"}
            </h3>
            <div className="text-base text-slate-700 font-semibold mb-2">
              Health ID: <span className="font-mono text-primary-800">{worker.id?.slice(0, 8)}...</span>
            </div>
            {worker.phone && (
              <div className="text-base text-slate-700 font-semibold flex items-center gap-2 mb-1">
                <span>📱</span> {worker.phone}
              </div>
            )}
            {worker.email && (
              <div className="text-base text-slate-700 font-semibold flex items-center gap-2">
                <span>✉️</span> {worker.email}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {allowWrite && (
              <Button onClick={onAddVisitAction} className="whitespace-nowrap">
                ➕ Add Visit
              </Button>
            )}
            {allowWrite && (
              <Link
                href={`/doctor/worker/${worker.id}`}
                className="btn-secondary whitespace-nowrap"
                onClick={onCloseAction}
              >
                ✏️ Edit Profile
              </Link>
            )}
            {!allowWrite && (
              <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg font-bold text-sm border-2 border-slate-300 cursor-not-allowed">
                🔒 Read Only
              </div>
            )}
            <button
              onClick={onCloseAction}
              className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-all font-bold text-sm border-2 border-slate-400"
            >
              Close
            </button>
          </div>
        </div>

        {/* Recent Visits */}
        <div>
          <h4 className="font-bold text-xl text-slate-900 mb-5 flex items-center gap-2">
            <span className="text-2xl">📋</span> Recent Visits
          </h4>
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3"></div>
              <div className="text-zinc-600 font-medium">Loading visits...</div>
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">📋</div>
              <div className="font-semibold">No visits yet</div>
            </div>
          )}

          {!loading && records.length > 0 && (
            <div className="space-y-3">
              {records.map((r: any) => (
                <div
                  key={r.id}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 mb-1">
                        {r.diagnosis_simple || r.diagnosis_raw || "Visit"}
                      </div>
                      <div className="text-sm text-slate-600">
                        {r.visit_date?.toDate?.()
                          ? new Date(r.visit_date.toDate()).toLocaleDateString()
                          : new Date(r.visit_date).toLocaleDateString()}
                      </div>
                      {r.severity && (
                        <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-bold uppercase ${r.severity === "high" ? "bg-red-100 text-red-700" :
                          r.severity === "medium" ? "bg-amber-100 text-amber-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                          {r.severity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
