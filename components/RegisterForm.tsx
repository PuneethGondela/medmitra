// components/RegisterForm.tsx
"use client";
import React, { useState } from "react";
import { registerUser } from "../lib/firebase-auth-helpers";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";
import FormInput from "@/components/FormInput";
import { Button } from "@/components/ui/button";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  gender: string;
};

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
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

    // Basic phone validation
    if (form.phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);

    try {
      // Register user with Firebase Auth and create Firestore profile
      await registerUser(form.email, form.password, {
        name: form.name,
        phone: form.phone,
        address: form.address || null,
        emergency_contact: form.emergencyContact || null,
        emergency_phone: form.emergencyPhone || null,
        role: "worker",
        language: "hi-IN", // Default to Hindi
        gender: form.gender || null,
      });

      setSuccess(true);
      setError(null);

      // Auto sign in after registration
      try {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        // Redirect to worker dashboard
        setTimeout(() => {
          router.push("/worker");
        }, 1500);
      } catch (signInError: any) {
        // Show success but ask to login manually
        setError("Account created! Please sign in.");
      }
    } catch (err: any) {
      console.error("Registration error:", err);

      // Firebase error codes
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered. Please sign in instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use a stronger password.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address. Please check your email.");
      } else {
        setError(err?.message ?? "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-r from-accent-50 to-accent-100/50 border-l-4 border-accent-500 rounded-xl p-6 text-center shadow-lg animate-in">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center text-3xl animate-pulse">
            ✓
          </div>
          <div className="text-accent-700 font-bold text-lg">Account Created Successfully!</div>
          <div className="text-sm text-accent-600 font-medium">Redirecting to your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-800 p-4 md:p-5 rounded-xl border-2 border-red-300 text-base font-semibold shadow-medium">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <span className="flex-1">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormInput
          label="Full Name *"
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder=""
          required
          className="w-full"
        />

        <FormInput
          label="Phone Number *"
          name="phone"
          value={form.phone}
          onChange={onChange}
          placeholder=""
          type="tel"
          required
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Gender
        </label>
        <select
          name="gender"
          value={form.gender}
          onChange={onChange}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <FormInput
        label="Email Address *"
        name="email"
        value={form.email}
        onChange={onChange}
        placeholder=""
        type="email"
        required
        className="w-full"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormInput
          label="Password *"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder=""
          type="password"
          required
          className="w-full"
        />

        <FormInput
          label="Confirm Password *"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={onChange}
          placeholder=""
          type="password"
          required
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Address (Optional)
        </label>
        <textarea
          name="address"
          value={form.address}
          onChange={onChange}
          placeholder="Enter your address"
          rows={3}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
        />
      </div>

      <div className="border-t border-gray-200/60 pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-lg">📞</span>
          Emergency Contact (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormInput
            label="Contact Name"
            name="emergencyContact"
            value={form.emergencyContact}
            onChange={onChange}
            placeholder=""
            className="w-full"
          />

          <FormInput
            label="Contact Phone"
            name="emergencyPhone"
            value={form.emergencyPhone}
            onChange={onChange}
            placeholder=""
            type="tel"
            className="w-full"
          />
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50/80 rounded-lg p-3 border border-gray-200">
        <span className="font-semibold text-gray-700">*</span> Required fields. Your data is secure and encrypted.
      </div>

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Account...
          </span>
        ) : (
          "Create Account"
        )}
      </Button>

      <div className="text-center text-sm text-gray-600 pt-2">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-primary-600 hover:text-primary-700 font-semibold underline transition-colors"
        >
          Sign in
        </button>
      </div>
    </form>
  );
}
