// utils/offline.ts - MIGRATED TO FIREBASE
// Med Mitra: "Ghost Data" fetcher — online first, fallback to localStorage cache.

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export async function getRecords(workerId: string | null): Promise<any[]> {
  if (!workerId) return [];

  const cacheKey = `medmitra_cached_records_${workerId}`;

  // Server-side or build-time: return empty
  if (typeof window === "undefined") return [];

  // Try network fetch when online
  try {
    if (navigator.onLine) {
      const recordsQuery = query(
        collection(db, "records"),
        where("worker_id", "==", workerId),
        orderBy("visit_date", "desc")
      );
      const recordsSnapshot = await getDocs(recordsQuery);
      
      // Get attachments and doctor info for each record
      const recordsData = await Promise.all(
        recordsSnapshot.docs.map(async (doc) => {
          const record = { id: doc.id, ...doc.data() };

          // Get attachments
          const attachmentsQuery = query(
            collection(db, "attachments"),
            where("record_id", "==", record.id)
          );
          const attachmentsSnapshot = await getDocs(attachmentsQuery);
          (record as any).attachments = attachmentsSnapshot.docs.map(att => ({
            id: att.id,
            ...(att.data() as any)
          }));

          // Get doctor info if available
          if ((record as any).doctor_id) {
            try {
              const doctorDoc = await import("@/lib/firebase-helpers").then(m =>
                m.getDocument("users", (record as any).doctor_id)
              );
              (record as any).doctor = doctorDoc ? { name: (doctorDoc as any).name } : null;
            } catch (e) {
              (record as any).doctor = null;
            }
          }

          return record;
        })
      );

      // Update cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(recordsData));
      } catch (e) {
        console.warn("localStorage write failed", e);
      }
      return recordsData;
    }
  } catch (e) {
    console.warn("Network fetch failed — falling back to cache", e);
  }

  // Offline / fallback path
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read cached records", e);
    return [];
  }
}
