// app/doctor/visits/page.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useEffect, useState } from "react";
import { getCurrentUser, queryCollection } from "../../../lib/firebase-helpers";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import Link from "next/link";
import DoctorVisitDetail from "../../../components/DoctorVisitDetail";

export default function DoctorVisitsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [selected, setSelected] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setDoctorId(user.uid);
        fetchPage(user.uid);
      }
    };
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchPage(uid: string) {
    setLoading(true);
    try {
      let recordsQuery = query(
        collection(db, "records"),
        orderBy("visit_date", "desc"),
        limit(pageSize * page)
      );

      // Filter by doctor if needed
      if (uid) {
        recordsQuery = query(
          collection(db, "records"),
          where("doctor_id", "==", uid),
          orderBy("visit_date", "desc"),
          limit(pageSize * page)
        );
      }

      const recordsSnapshot = await getDocs(recordsQuery);
      let recordsData = recordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply search filter client-side (Firestore has limited text search)
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        recordsData = recordsData.filter(r =>
          (r.diagnosis_simple || "").toLowerCase().includes(queryLower) ||
          (r.diagnosis_raw || "").toLowerCase().includes(queryLower)
        );
      }

      // Paginate client-side
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      setRecords(recordsData.slice(start, end));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = () => {
    setPage(1);
    if (doctorId) {
      fetchPage(doctorId);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">All Visits</h1>
        <Link href="/doctor/add-visit" className="btn-primary">Add Visit</Link>
      </header>

      <div className="flex gap-2">
        <input 
          placeholder="Search diagnosis..." 
          className="input-field flex-1" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
        <button 
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm" 
          onClick={handleSearch}
        >
          Search
        </button>
      </div>

      {loading && <div>Loading...</div>}

      <div className="grid gap-3">
        {records.map((r) => (
          <div key={r.id} className="card flex justify-between items-center">
            <div>
              <div className="font-medium text-gray-900">{r.diagnosis_simple ?? r.diagnosis_raw}</div>
              <div className="text-xs text-gray-500">
                Worker: {r.worker_id?.slice(0, 8)} • {
                  r.visit_date?.toDate?.()
                    ? new Date(r.visit_date.toDate()).toLocaleString()
                    : new Date(r.visit_date).toLocaleString()
                }
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelected(r)} 
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Open
              </button>
              <Link 
                href={`/worker/record/${r.id}`} 
                className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors font-medium text-sm"
              >
                Worker View
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div>
          <button 
            disabled={page <= 1} 
            onClick={() => setPage((p) => Math.max(1, p - 1))} 
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed mr-2"
          >
            Prev
          </button>
          <button 
            onClick={() => setPage((p) => p + 1)} 
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Next
          </button>
        </div>
        <div className="text-sm text-gray-500">Page {page}</div>
      </div>

      {selected && <DoctorVisitDetail record={selected} onCloseAction={() => setSelected(null)} />}
    </div>
  );
}
