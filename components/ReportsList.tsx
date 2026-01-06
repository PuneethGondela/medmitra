// components/ReportsList.tsx
"use client";
import React, { useState, useEffect } from "react";
import { getSignedUrl, extractStoragePath } from "../utils/files";

export default function ReportsList({ records }: { records: any[] }) {
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Collect attachments across records (flatten)
  const attachments = (records ?? []).flatMap((r) =>
    (r.attachments ?? []).map((a: any) => ({
      ...a,
      visit_date: r.visit_date,
      record_id: r.id,
      diagnosis: r.diagnosis_simple || r.diagnosis_raw,
    }))
  );

  const loadSignedUrl = async (attachment: any) => {
    if (signedUrls[attachment.id]) return;

    setLoadingUrls((prev) => ({ ...prev, [attachment.id]: true }));
    const path = extractStoragePath(attachment.file_url);
    if (path) {
      const url = await getSignedUrl(path, attachment.record_id);
      if (url) {
        setSignedUrls((prev) => ({ ...prev, [attachment.id]: url }));
      }
    }
    setLoadingUrls((prev) => ({ ...prev, [attachment.id]: false }));
  };

  const getFileUrl = (attachment: any) => {
    // If we have a signed URL, use it; otherwise use the original URL
    return signedUrls[attachment.id] || attachment.file_url;
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType?.toLowerCase() || "";
    if (type.includes("xray") || type.includes("image")) return "🖼️";
    if (type.includes("lab")) return "🧪";
    if (type.includes("prescription")) return "💊";
    return "📄";
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">📁</div>
        <div>No reports or scans found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.map((a: any) => (
        <div
          key={a.id}
          className="card flex items-center justify-between hover:shadow-strong transition-all duration-200 bg-gradient-to-r from-white via-secondary-50/30 to-primary-50/30 border-2 border-secondary-200/50 hover:border-secondary-400/50"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="text-3xl">{getFileIcon(a.file_type)}</div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {a.description || a.file_type || "Attachment"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {a.diagnosis && <span>{a.diagnosis} • </span>}
                {new Date(a.created_at).toLocaleDateString()}
              </div>
              {a.file_type && (
                <span className="inline-block mt-1 text-xs badge-info">
                  {a.file_type}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!signedUrls[a.id] && (
              <button
                onClick={() => loadSignedUrl(a)}
                disabled={loadingUrls[a.id]}
                className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-50"
              >
                {loadingUrls[a.id] ? "Loading..." : "Load"}
              </button>
            )}
            <a
              href={getFileUrl(a)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              onClick={() => {
                if (!signedUrls[a.id]) {
                  loadSignedUrl(a);
                }
              }}
            >
              👁️ Open
            </a>
            <a
              href={getFileUrl(a)}
              download
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              onClick={() => {
                if (!signedUrls[a.id]) {
                  loadSignedUrl(a);
                }
              }}
            >
              ⬇️ Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

