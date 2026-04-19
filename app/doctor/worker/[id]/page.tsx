// app/doctor/worker/[id]/page.tsx - MIGRATED TO FIREBASE
"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser, getDocument, updateDocument, queryCollection } from "../../../../lib/firebase-helpers";
import { useRouter, useParams } from "next/navigation";
import FormInput from "../../../../components/FormInput";
import Button from "../../../../components/Button";
import Link from "next/link";

export default function DoctorWorkerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const workerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [worker, setWorker] = useState<any | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    language: "hi-IN",
    aadhaar_number: "",
    aadhaar_name: "",
    aadhaar_dob: "",
    aadhaar_address: "",
    aadhaar_verified: false,
  });

  const loadWorkerProfile = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocument("users", workerId);

      if (data && (data as any).role === "worker") {
        setWorker(data);
        setProfile({
          name: (data as any).name || "",
          email: (data as any).email || "",
          phone: (data as any).phone || "",
          address: (data as any).address || "",
          emergency_contact: (data as any).emergency_contact || "",
          emergency_phone: (data as any).emergency_phone || "",
          language: (data as any).language || "hi-IN",
          aadhaar_number: (data as any).aadhaar_number || "",
          aadhaar_name: (data as any).aadhaar_name || "",
          aadhaar_dob: (data as any).aadhaar_dob || "",
          aadhaar_address: (data as any).aadhaar_address || "",
          aadhaar_verified: (data as any).aadhaar_verified || false,
        });
      }
    } catch (err: any) {
      console.error("Error loading worker:", err);
      setMessage("Failed to load worker profile");
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  const checkAccess = React.useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const userData = await getDocument("users", user.uid);

      if ((userData as any)?.role !== "doctor" && (userData as any)?.role !== "admin") {
        router.push("/worker");
        return;
      }

      setIsDoctor(true);
      loadWorkerProfile();
    } catch (err) {
      console.error(err);
      router.push("/login");
    }
  }, [router, loadWorkerProfile]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setProfile((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;

    setSaving(true);
    setMessage(null);

    try {
      await updateDocument("users", workerId, {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        emergency_contact: profile.emergency_contact,
        emergency_phone: profile.emergency_phone,
        language: profile.language,
        aadhaar_number: profile.aadhaar_number || null,
        aadhaar_name: profile.aadhaar_name || null,
        aadhaar_dob: profile.aadhaar_dob || null,
        aadhaar_address: profile.aadhaar_address || null,
        aadhaar_verified: profile.aadhaar_verified,
        updated_at: new Date().toISOString(),
      });

      setMessage("✅ Data updated successfully! Worker profile saved to database.");
      setTimeout(() => setMessage(null), 3000);

      // Reload to get updated data
      loadWorkerProfile();
    } catch (err: any) {
      setMessage("Error: " + (err.message || "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">👨‍⚕️</div>
          <div className="text-gray-600">Loading worker profile...</div>
        </div>
      </div>
    );
  }

  if (!isDoctor || !worker) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white shadow-strong">
        <div>
          <h1 className="text-2xl font-bold text-white">
            ✏️ Edit Worker Profile
          </h1>
          <p className="text-sm text-primary-50 font-medium">
            Health ID: {worker.id?.slice(0, 8)}...
          </p>
        </div>
        <Link href="/doctor" className="px-4 py-2 bg-white/20 text-white border-2 border-white/30 rounded-lg hover:bg-white/30 transition-all font-medium">
          ← Back
        </Link>
      </header>

      <form onSubmit={handleSave} className="card space-y-4 bg-gradient-to-br from-white via-primary-50/40 to-secondary-50/40 border-2 border-primary-200/50">
        {message && (
          <div
            className={`p-3 rounded-xl border-2 font-medium shadow-soft ${message.includes("Error")
              ? "bg-gradient-to-r from-danger-100 to-danger-50 text-danger-700 border-danger-300"
              : "bg-gradient-to-r from-accent-100 to-accent-50 text-accent-700 border-accent-300"
              }`}
          >
            {message.includes("Error") ? "❌ " : "✅ "}{message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name *"
            name="name"
            value={profile.name}
            onChange={handleChange}
            required
          />

          <FormInput
            label="Phone Number *"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            type="tel"
            required
          />
        </div>

        <FormInput
          label="Email"
          name="email"
          value={profile.email}
          onChange={handleChange}
          type="email"
          disabled
          className="bg-gray-50"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Address
          </label>
          <textarea
            name="address"
            value={profile.address}
            onChange={handleChange}
            rows={3}
            className="input-field"
            placeholder="Worker's current address"
          />
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Contact Name"
              name="emergency_contact"
              value={profile.emergency_contact}
              onChange={handleChange}
              placeholder="Emergency contact name"
            />

            <FormInput
              label="Contact Phone"
              name="emergency_phone"
              value={profile.emergency_phone}
              onChange={handleChange}
              type="tel"
              placeholder="Emergency contact number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Preferred Language
          </label>
          <select
            name="language"
            value={profile.language}
            onChange={handleChange}
            className="input-field"
          >
            <option value="hi-IN">हिंदी (Hindi)</option>
            <option value="en-IN">English</option>
            <option value="te-IN">తెలుగు (Telugu)</option>
            <option value="or-IN">ଓଡ଼ିଆ (Odia)</option>
          </select>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Aadhaar Information (Optional)</h3>
          <p className="text-xs text-gray-600 mb-4">
            Enter Aadhaar details manually. These fields can be updated by doctors.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Aadhaar Number"
              name="aadhaar_number"
              value={profile.aadhaar_number}
              onChange={handleChange}
              placeholder="XXXX XXXX XXXX (12 digits)"
              type="text"
              maxLength={14}
            />

            <FormInput
              label="Name (as per Aadhaar)"
              name="aadhaar_name"
              value={profile.aadhaar_name}
              onChange={handleChange}
              placeholder="Name from Aadhaar card"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormInput
              label="Date of Birth (from Aadhaar)"
              name="aadhaar_dob"
              value={profile.aadhaar_dob}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              type="date"
            />

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                name="aadhaar_verified"
                checked={profile.aadhaar_verified}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Aadhaar Verified
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address (as per Aadhaar)
            </label>
            <textarea
              name="aadhaar_address"
              value={profile.aadhaar_address}
              onChange={handleChange}
              rows={2}
              className="input-field"
              placeholder="Address from Aadhaar card"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href="/doctor" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>

      {/* Worker Records Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Worker&apos;s Medical Records</h3>
        <WorkerRecordsList workerId={workerId} />
      </div>
    </div>
  );
}

function WorkerRecordsList({ workerId }: { workerId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadRecords = async () => {
      setLoading(true);
      try {
        const data = await queryCollection(
          "records",
          [{ field: "worker_id", operator: "==", value: workerId }],
          "visit_date",
          "desc",
          10
        );

        if (isMounted) setRecords(data);
      } catch (err) {
        console.error("Error loading records:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRecords();
    return () => { isMounted = false; };
  }, [workerId]);

  if (loading) return <div className="text-gray-500">Loading records...</div>;
  if (records.length === 0)
    return <div className="text-gray-500">No records found</div>;

  return (
    <div className="space-y-2">
      {records.map((r) => (
        <div
          key={r.id}
          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {r.diagnosis_simple || r.diagnosis_raw || "Visit"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {r.visit_date?.toDate?.()
                  ? new Date(r.visit_date.toDate()).toLocaleString()
                  : new Date(r.visit_date).toLocaleString()}
              </div>
            </div>
            <Link
              href={`/worker/record/${r.id}`}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
