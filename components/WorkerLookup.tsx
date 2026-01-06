// components/WorkerLookup.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useState } from "react";
import { queryCollection } from "../lib/firebase-helpers";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export default function WorkerLookup({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search workers (Firestore has limited text search, so we filter client-side)
      const workersQuery = query(
        collection(db, "users"),
        where("role", "==", "worker"),
        limit(100) // Get more and filter client-side
      );
      const workersSnapshot = await getDocs(workersQuery);
      const searchTerm = q.toLowerCase();
      
      const matches = workersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((w: any) =>
          w.name?.toLowerCase().includes(searchTerm) ||
          w.email?.toLowerCase().includes(searchTerm) ||
          w.phone?.includes(searchTerm) ||
          w.id?.toLowerCase().includes(searchTerm)
        )
        .slice(0, 10);

      setResults(matches);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          placeholder="Search worker by name, email, or phone..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim()) {
              search();
            } else {
              setResults([]);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          className="input-field flex-1"
        />
        <button
          onClick={search}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.id}
              className="p-3 border-b border-gray-100 last:border-b-0 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">{r.name || "No name"}</div>
                <div className="text-xs text-gray-500">
                  {r.email} • {r.phone || "No phone"} • ID: {r.id.slice(0, 8)}...
                </div>
              </div>
              <button
                onClick={() => onSelect(r.id, r.name || "Unknown")}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}

      {q && results.length === 0 && !loading && (
        <div className="text-sm text-gray-500 p-2">No workers found</div>
      )}
    </div>
  );
}
