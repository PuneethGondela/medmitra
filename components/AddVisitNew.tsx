// components/AddVisitNew.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useState } from "react";
import { getCurrentUser, insertDocument, uploadFile } from "../lib/firebase-helpers";
import Button from "./Button";
import { extractEntities } from "../lib/ml-client";
import { Timestamp } from "firebase/firestore";
import CredentialsResult from "./add-visit/CredentialsResult";
import WorkerProfileForm from "./add-visit/WorkerProfileForm";
import VisitDetailsForm from "./add-visit/VisitDetailsForm";

export default function AddVisitNew({
  prefill,
  onCreated,
}: {
  prefill?: any;
  onCreated: (worker: any, rec: any) => void;
}) {
  const [workerData, setWorkerData] = useState({
    name: prefill?.name ?? "",
    email: "",
    phone: "",
    password: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    age: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    language: "hi-IN",
    donorConsent: false,
  });

  const [visitData, setVisitData] = useState({
    diagnosisRaw: "",
    diagnosisSimple: "",
    prescription: "",
    voiceNote: "",
    severity: "low" as "low" | "medium" | "high",
    file: null as File | null,
  });

  const [consentObtained, setConsentObtained] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    workerId: string;
  } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [entities, setEntities] = useState<any>(null);

  const handleWorkerChange = (field: string, value: string | boolean) => {
    setWorkerData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVisitChange = (field: string, value: string | File | null) => {
    setVisitData((prev) => ({ ...prev, [field]: value }));
    if (field === "prescription") {
      setEntities(null); // Reset entities if prescription changes
    }
  };

  async function handleExtractEntities() {
    if (!visitData.prescription.trim()) return;

    setExtracting(true);
    setMessage(null);
    setEntities(null);
    try {
      setMessage("🔄 Extracting entities... This may take 5-10 seconds on first use.");
      const result = await extractEntities(visitData.prescription);
      setEntities(result.entities);
      // Safety check for null/undefined entities (which backend might return on empty/error)
      if (
        result.entities &&
        typeof result.entities === "object" &&
        Object.values(result.entities).some((arr: any) => Array.isArray(arr) && arr.length > 0)
      ) {
        setMessage("✅ Entities extracted successfully!");
      } else {
        setMessage("ℹ️ No entities found. You can continue manually.");
        setEntities(
          result.entities || {
            medicines: [],
            dosages: [],
            frequencies: [],
            conditions: [],
            durations: [],
            warnings: [],
          }
        );
      }
    } catch (error: any) {
      console.error("Entity extraction failed:", error);
      setMessage(error.message || "Failed to extract entities. Please continue without it.");
      setEntities(null);
    } finally {
      setExtracting(false);
    }
  }

  // Helper to compress image
  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024; // Resize to max 1024px width
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas to Blob failed"));
            },
            "image/jpeg",
            0.7
          ); // Compress to 70% quality JPEG
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // Calculate age from DOB if age is empty but DOB provided
    let calculatedAge = workerData.age;
    if (!workerData.age && workerData.dob) {
      const birthDate = new Date(workerData.dob);
      const diff = Date.now() - birthDate.getTime();
      const ageDate = new Date(diff);
      calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
    }

    if (
      !workerData.name ||
      !workerData.email ||
      !workerData.password ||
      !visitData.diagnosisRaw ||
      !consentObtained
    ) {
      setMessage("Name, email, password, diagnosis, and consent are required");
      return;
    }

    setLoading(true);

    try {
      // Get current user token
      const user = await getCurrentUser();
      if (!user) {
        setMessage("Not authenticated");
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();

      // 1. Create Worker Account
      setMessage("⏳ Creating worker account... (Step 1/3)");
      const response = await fetch("/api/doctor/create-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: workerData.email,
          password: workerData.password,
          name: workerData.name,
          phone: workerData.phone || null,
          address: workerData.address || null,
          emergencyContact: workerData.emergencyContact || null,
          emergencyPhone: workerData.emergencyPhone || null,
          age: calculatedAge,
          dob: workerData.dob, // New Field
          bloodGroup: workerData.bloodGroup,
          gender: workerData.gender, // New Field
          language: workerData.language, // New Field: Mother Tongue
          donorConsent: workerData.donorConsent, // New Field
          consentObtained,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create worker");
      }

      const worker = data.worker;

      // 2. Save Visit Record
      setMessage("⏳ Saving visit details... (Step 2/3)");
      const doctorId = user.uid;
      if (!doctorId) throw new Error("Not authenticated");

      const recordData = {
        worker_id: worker.id,
        doctor_id: doctorId,
        diagnosis_raw: visitData.diagnosisRaw,
        diagnosis_simple: visitData.diagnosisSimple || visitData.diagnosisRaw,
        prescription_note: visitData.prescription,
        voice_note: visitData.voiceNote,
        severity: visitData.severity,
        visit_date: Timestamp.now(),
      };

      const recordId = await insertDocument("records", recordData);
      const rec = { id: recordId, ...recordData };

      // 3. Upload file if provided
      if (visitData.file) {
        setMessage("⏳ Compressing and uploading scan... (Step 3/3)");
        let fileToUpload: File | Blob = visitData.file;

        // Compress if image
        if (visitData.file.type.startsWith("image/")) {
          try {
            fileToUpload = await compressImage(visitData.file);
          } catch (compressErr) {
            console.error("Compression failed, using original file", compressErr);
          }
        }

        const filePath = `${worker.id}/${Date.now()}_${visitData.file.name}`;

        // Use the compressed blob
        const fileUrl = await uploadFile("health-files", filePath, fileToUpload);

        await insertDocument("attachments", {
          record_id: recordId,
          file_path: filePath,
          file_url: fileUrl,
          file_type: visitData.file.type,
          uploaded_at: Timestamp.now(),
        });
      }

      setCreatedCredentials({
        email: workerData.email,
        password: workerData.password,
        workerId: worker.id,
      });

      setMessage("✅ Data added successfully! Worker account and visit saved to database.");
      onCreated(worker, rec);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to create worker and visit");
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setCreatedCredentials(null);
    setWorkerData({
      name: "",
      email: "",
      phone: "",
      password: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      age: "",
      dob: "",
      gender: "",
      bloodGroup: "",
      language: "hi-IN",
      donorConsent: false,
    });
    setVisitData({
      diagnosisRaw: "",
      diagnosisSimple: "",
      prescription: "",
      voiceNote: "",
      severity: "low",
      file: null,
    });
    setConsentObtained(false);
    setMessage(null);
    setEntities(null);
  };

  // Show credentials if worker was just created
  if (createdCredentials) {
    return (
      <CredentialsResult
        credentials={createdCredentials}
        onCreateAnother={resetForm}
        onContinue={() => setCreatedCredentials(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8">
      <h3 className="text-xl md:text-2xl font-bold mb-6 text-slate-900 flex items-center gap-2">
        <span className="text-2xl">👤</span>
        Create Worker & Add Visit
      </h3>

      {message && (
        <div
          className={`mb-6 p-4 md:p-5 rounded-xl text-base font-semibold shadow-medium border-2 ${
            message.includes("success")
              ? "bg-green-50 text-green-800 border-green-300"
              : "bg-red-50 text-red-800 border-red-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{message.includes("success") ? "✅" : "❌"}</span>
            <span>{message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        <WorkerProfileForm data={workerData} onChange={handleWorkerChange} />

        <VisitDetailsForm
          data={visitData}
          onChange={handleVisitChange}
          onExtractEntities={handleExtractEntities}
          extracting={extracting}
          entities={entities}
        />

        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="checkbox"
            id="consent"
            checked={consentObtained}
            onChange={(e) => setConsentObtained(e.target.checked)}
            className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
          />
          <label htmlFor="consent" className="text-sm text-slate-700 cursor-pointer select-none">
            I certify that I have obtained explicit consent from the user/patient for collecting their personal and medical data, and for their treatment.
          </label>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create Worker & Save Visit"}
        </Button>
      </form>
    </div>
  );
}
