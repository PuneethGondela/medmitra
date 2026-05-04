// app/worker/record/[id]/page.tsx - MIGRATED TO FIREBASE
"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { getDocument, queryCollection } from "../../../../lib/firebase-helpers";
import { speakHealthRecord } from "../../../../utils/voice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../providers";

export default function RecordPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [record, setRecord] = useState<any | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch record from Firestore
      const recordData = await getDocument("records", id);
      setRecord(recordData);

      // Fetch attachments
      if (recordData) {
        const attData = await queryCollection(
          "attachments",
          [{ field: "record_id", operator: "==", value: id }]
        );
        setAttachments(attData);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (!record) return <div className="p-6">Record not found</div>;

  const ttsText =
    record.voice_note || record.diagnosis_simple || record.diagnosis_raw;

  return (
    <div className="max-w-3xl card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {record.diagnosis_simple ?? record.diagnosis_raw}
          </h2>
          <div className="text-sm text-gray-500">
            {t("your_visits")}: {
              record.visit_date?.toDate?.()
                ? new Date(record.visit_date.toDate()).toLocaleString()
                : new Date(record.visit_date).toLocaleString()
            }
          </div>
          <div className="text-sm text-gray-500">
            Doctor: {record.doctor_id?.slice(0, 8)}
          </div>
        </div>

        <button
          onClick={() => speakHealthRecord(ttsText, locale)}
          className="px-3 py-1.5 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors shadow-soft"
        >
          {t("speak")}
        </button>
      </div>

      <div className="mb-3">
        <p><strong>{t("prescription")}:</strong> {record.prescription_note || "—"}</p>
        <p><strong>{t("voice_twin")}:</strong> {record.voice_note || "—"}</p>
      </div>

      <h3 className="font-medium mb-4">{t("attachments")}</h3>

      {attachments.length === 0 ? (
        <div className="text-gray-500 text-center py-8 bg-gray-50 rounded">
          No attachments for this visit
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((a) => {
            const isImage = a.file_type?.toLowerCase().includes("image") || 
                           a.file_type?.toLowerCase().includes("xray") ||
                           a.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isLab = a.file_type?.toLowerCase().includes("lab");
            
            return (
              <div
                key={a.id}
                className="bg-white border rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Thumbnail/Icon */}
                <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                  {isImage ? (
                    <Image fill
                      src={a.file_url}
                      alt={a.description || "Attachment"}
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${isImage ? "hidden" : ""}`}>
                    <div className="text-6xl">
                      {isLab ? "🧪" : isImage ? "🖼️" : "📄"}
                    </div>
                  </div>
                  {/* Badge */}
                  <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-lg">
                    {a.file_type || "File"}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="font-medium text-sm mb-2 line-clamp-2">
                    {a.description || a.file_type || "Attachment"}
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors shadow-soft"
                    >
                      👁️ View
                    </a>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = a.file_url;
                        link.download = a.description || "attachment";
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                      ⬇️ Save
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Link href="/worker" className="text-primary-600 hover:text-primary-700 underline font-medium">
          {t("back_to_records")}
        </Link>
      </div>
    </div>
  );
}
