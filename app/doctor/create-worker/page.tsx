// app/doctor/create-worker/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import FormInput from "../../../components/FormInput";
import Button from "../../../components/Button";
import Link from "next/link";

export default function CreateWorkerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    aadhaar_number: "",
    aadhaar_name: "",
    aadhaar_dob: "",
    aadhaar_address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const checkDoctorAccess = React.useCallback(async () => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.push("/login");
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            router.push("/worker");
            return;
          }

          const userData = userDoc.data();
          if (userData?.role !== "doctor" && userData?.role !== "admin") {
            router.push("/worker");
            return;
          }

          setIsDoctor(true);
        } catch (err) {
          console.error(err);
          router.push("/login");
        } finally {
          setLoading(false);
        }
      });

      // If no user immediately, stop loading
      if (!auth.currentUser) {
        setLoading(false);
      }

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      router.push("/login");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkDoctorAccess();
  }, [checkDoctorAccess]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);

    try {
      // Get current Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        setError("Not authenticated. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const token = await user.getIdToken();

      // Call server-side API to create worker
      const response = await fetch("/api/doctor/create-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone,
          address: form.address || null,
          emergencyContact: form.emergencyContact || null,
          emergencyPhone: form.emergencyPhone || null,
          aadhaar_number: form.aadhaar_number || null,
          aadhaar_name: form.aadhaar_name || null,
          aadhaar_dob: form.aadhaar_dob || null,
          aadhaar_address: form.aadhaar_address || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create worker account");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setError(null);

      // Clear form
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        aadhaar_number: "",
        aadhaar_name: "",
        aadhaar_dob: "",
        aadhaar_address: "",
      });

      // Auto sign in the worker (optional - you might want to skip this)
      // await supabase.auth.signInWithPassword({
      //   email: form.email,
      //   password: form.password,
      // });
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err?.message ?? "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isDoctor) {
    return null;
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-gradient-to-br from-white via-accent-50/40 to-primary-50/40 border-2 border-accent-200/50">
          <div className="bg-gradient-to-r from-accent-100 to-accent-50 border-2 border-accent-300 rounded-xl p-6 text-center shadow-soft">
            <div className="text-accent-700 font-semibold mb-2 text-lg">✅ Data added successfully! Worker account created and saved to database.</div>
            <div className="text-sm text-accent-600 mb-4 font-medium">
              The worker can now sign in with their email and password.
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setSuccess(false)} variant="secondary">
                Create Another
              </Button>
              <Link href="/doctor" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 p-6 rounded-xl bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white shadow-strong">
        <div>
          <h1 className="text-2xl font-bold text-white">👤 Create Worker Account</h1>
          <p className="text-sm text-primary-50 font-medium">Register a new worker to the system</p>
        </div>
        <Link href="/doctor" className="px-4 py-2 bg-white/20 text-white border-2 border-white/30 rounded-lg hover:bg-white/30 transition-all font-medium">
          ← Back
        </Link>
      </div>

      <div className="card bg-gradient-to-br from-white via-accent-50/40 to-primary-50/40 border-2 border-accent-200/50">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger-50 text-danger-700 p-3 rounded-lg border border-danger-200 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Full Name *"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Enter worker's full name"
              required
            />

            <FormInput
              label="Phone Number *"
              name="phone"
              value={form.phone}
              onChange={onChange}
              placeholder="10-digit mobile number"
              type="tel"
              required
            />
          </div>

          <FormInput
            label="Email Address *"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="worker@example.com"
            type="email"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Password *"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="At least 6 characters"
              type="password"
              required
            />

            <FormInput
              label="Confirm Password *"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder="Re-enter password"
              type="password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address (Optional)
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={onChange}
              placeholder="Worker's current address"
              rows={2}
              className="input-field"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Contact Name"
                name="emergencyContact"
                value={form.emergencyContact}
                onChange={onChange}
                placeholder="Emergency contact name"
              />

              <FormInput
                label="Contact Phone"
                name="emergencyPhone"
                value={form.emergencyPhone}
                onChange={onChange}
                placeholder="Emergency contact number"
                type="tel"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Aadhaar Information (Optional)</h3>
            <p className="text-xs text-gray-600 mb-4">
              Enter Aadhaar details manually. These can be updated later from the worker profile page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Aadhaar Number"
                name="aadhaar_number"
                value={form.aadhaar_number}
                onChange={onChange}
                placeholder="XXXX XXXX XXXX (12 digits)"
                type="text"
                maxLength={14}
              />

              <FormInput
                label="Name (as per Aadhaar)"
                name="aadhaar_name"
                value={form.aadhaar_name}
                onChange={onChange}
                placeholder="Name from Aadhaar card"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput
                label="Date of Birth (from Aadhaar)"
                name="aadhaar_dob"
                value={form.aadhaar_dob}
                onChange={onChange}
                placeholder="YYYY-MM-DD"
                type="date"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Address (as per Aadhaar)
              </label>
              <textarea
                name="aadhaar_address"
                value={form.aadhaar_address}
                onChange={onChange}
                placeholder="Address from Aadhaar card"
                rows={2}
                className="input-field"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500">
            * Required fields. The worker will be able to sign in immediately after account creation.
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating Account…" : "Create Worker Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

