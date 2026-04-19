// components/LoginFormFirebase.tsx
// Firebase-based login form (replaces Supabase version)
"use client";
import React, { useState } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, query, collection, where, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import FormInput from "@/components/FormInput";
import { Button } from "@/components/ui/button";

type FormState = {
  identifier: string; // Email or mobile for users, email only for doctors
  password: string;
};

export default function LoginFormFirebase() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  // Helper function to route user based on role
  const routeUser = async (userId: string) => {
    try {
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        setError("User profile not found. Please contact admin.");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData?.role || 'worker';

      console.debug("Login routing - User ID:", userId, "Role:", role);

      // Route based on role
      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "doctor") {
        router.replace("/doctor");
      } else {
        router.replace("/worker");
      }
    } catch (err: any) {
      console.error("Error in routeUser:", err);
      setError(err?.message ?? "Failed to route user. Please try again.");
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.identifier || !form.password) {
      setError("Enter email/mobile and password.");
      return;
    }

    setLoading(true);
    try {
      // ---------------------------------------------------------
      // 1. ATTEMPT ADMIN LOGIN (Backend API) - Supports email OR mobile
      // ---------------------------------------------------------
      try {
        const adminRes = await fetch("http://localhost:4000/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: form.identifier, password: form.password }),
        });

        if (adminRes.ok) {
          const adminData = await adminRes.json();
          localStorage.setItem("admin_token", adminData.token);
          localStorage.setItem("admin_user", JSON.stringify(adminData.user));

          console.debug("Admin login successful, redirecting...");
          setTimeout(() => router.push("/admin"), 100);
          return;
        }
      } catch (adminErr) {
        console.warn("Backend admin login check failed or skipped:", adminErr);
      }

      // ---------------------------------------------------------
      // 2. ATTEMPT DOCTOR LOGIN (Backend API) - EMAIL ONLY
      // ---------------------------------------------------------
      if (form.identifier.includes('@')) {
        try {
          const doctorRes = await fetch("http://localhost:4000/api/doctors/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.identifier, password: form.password }),
          });

          if (doctorRes.ok) {
            const doctorData = await doctorRes.json();
            localStorage.setItem("doctor_token", doctorData.token);
            localStorage.setItem("doctor_user", JSON.stringify(doctorData.user));
            console.debug("Doctor login successful, redirecting...");
            setTimeout(() => router.push("/doctor"), 100);
            return;
          }
        } catch (docErr) {
          console.warn("Backend doctor login check failed:", docErr);
        }
      }

      // ---------------------------------------------------------
      // 3. ATTEMPT USER/WORKER LOGIN (Firebase Auth) - Email OR Mobile
      // ---------------------------------------------------------
      let userEmailForAuth = form.identifier;

      // If identifier is a mobile number (no @), find user by phone in Firestore
      if (!form.identifier.includes('@')) {
        try {
          const q = query(
            collection(db, 'users'),
            where('phone', '==', form.identifier),
            limit(1)
          );
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            setError("No account found with this mobile number.");
            setLoading(false);
            return;
          }

          const userData = snapshot.docs[0].data();
          if (!userData.email) {
            setError("User account found but no email address.");
            setLoading(false);
            return;
          }

          userEmailForAuth = userData.email;
          console.debug("Found user by mobile:", userData.email);
        } catch (mobileLookupErr) {
          console.error("Mobile lookup error:", mobileLookupErr);
          setError("Could not find account. Please use email address.");
          setLoading(false);
          return;
        }
      }

      // Now try Firebase Auth with email (either provided or found from mobile)
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userEmailForAuth,
        form.password
      );

      const userId = userCredential.user.uid;

      // Route user based on their role
      await routeUser(userId);

    } catch (err: any) {
      console.error("Unexpected sign-in error:", err);
      
      // Firebase Auth error codes
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid credentials.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address.");
      } else {
        setError(err?.message ?? "Sign-in failed. Please try again.");
      }
      
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-800 p-4 md:p-5 rounded-lg border border-red-300 text-base font-semibold">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <span className="flex-1">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <FormInput
          label="Email address or Mobile Number"
          name="identifier"
          value={form.identifier}
          onChange={onChange}
          placeholder="Enter your email or mobile number"
          type="text"
          required
          className="w-full"
        />
        <p className="text-xs text-gray-500 -mt-3 ml-1">Admin: email or mobile | Doctor: email only | User: email or mobile</p>

        <FormInput
          label="Password"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="Enter your password"
          type="password"
          required
          className="w-full"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </span>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
