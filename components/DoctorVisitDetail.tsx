// components/DoctorVisitDetail.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useEffect, useState } from "react";
import { queryCollection } from "../lib/firebase-helpers";
import VoiceButton from "./ui/VoiceButton";

export default function DoctorVisitDetail({ record, onCloseAction }: { record: any; onCloseAction: () => void; }) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await queryCollection(
          "attachments",
          [{ field: "record_id", operator: "==", value: record.id }]
        );
        setAttachments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [record]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center p-6 z-50">
      <div className="card w-full max-w-2xl shadow-strong">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{record.diagnosis_simple ?? record.diagnosis_raw}</h3>
            <div className="text-sm text-gray-500">Worker: {record.worker_id}</div>
          </div>
          <div className="flex gap-2">
            <VoiceButton
              text={record.voice_note || record.diagnosis_simple || record.diagnosis_raw}
              language="en"
              compact={false}
              className="px-3 py-1.5 rounded-lg shadow-soft"
            />
            <button onClick={onCloseAction} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">Close</button>
          </div>
        </div>

        <div className="mb-4">
          <p><strong>Prescription:</strong> {record.prescription_note || "-"}</p>
          <p><strong>Voice note:</strong> {record.voice_note || "-"}</p>
          <p className="text-sm text-gray-500">Severity: {record.severity}</p>
        </div>

        <div>
          <h4 className="font-medium mb-2">Attachments</h4>
          {loading && <div>Loading attachments...</div>}
          {!loading && attachments.length === 0 && <div className="text-gray-500">No attachments</div>}
          <div className="grid gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="text-sm">{a.description}</div>
                  <div className="text-xs text-gray-500">{a.file_type}</div>
                </div>
                <div>
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 underline font-medium mr-2">Open</a>
                  <a href={a.file_url} download className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">Download</a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
