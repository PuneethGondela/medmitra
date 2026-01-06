// components/RecordCard.tsx
"use client";

import React from "react";
import Link from "next/link";

export default function RecordCard({
  record,
  language,
  onSpeakAction
}: {
  record: any;
  language: string;
  onSpeakAction: () => void;
}) {
  return (
    <div className="card flex justify-between items-center hover:shadow-strong transition-all duration-200 bg-gradient-to-r from-white via-primary-50/30 to-secondary-50/30 border-2 border-primary-200/50 hover:border-primary-400/50">
      <div className="flex-1">
        <div className="font-semibold text-gray-900 text-lg">
          {record.diagnosis_simple ?? record.diagnosis_raw}
        </div>
        <div className="text-xs text-gray-600 mt-1 font-medium">
          Doctor: {record.doctor_id?.slice(0, 8)} •{" "}
          {new Date(record.visit_date).toLocaleDateString()}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={onSpeakAction}
          className="px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-lg hover:from-accent-600 hover:to-accent-700 transition-all shadow-medium font-semibold"
          title="Play voice note"
        >
          🔊
        </button>

        <Link
          href={`/worker/record/${record.id}`}
          className="px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all shadow-medium font-semibold text-sm"
        >
          View
        </Link>
      </div>
    </div>
  );
}
