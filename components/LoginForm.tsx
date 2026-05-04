// components/LoginForm.tsx - Simplified login form
"use client";
import React, { useState } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, query, collection, where, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import FormInput from "@/components/FormInput";
import { Button } from "@/components/ui/button";
import { login as apiLogin } from "../lib/api";

type FormState = {
  identifier: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
    // Clear error when user types
    if (error) setError(null);
  };

  // Helper function to route user based on role
  const routeUser = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        setError("User profile not found. Please contact admin.");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData?.role || 'worker';

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
      setError("Please enter email/mobile and password.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Try Admin/Doctor login via backend API
      try {
        const result = await apiLogin(form.identifier, form.password);

        // If backend returned a Firebase Custom Token, sign in to Firebase SDK
        if ((result as any).firebaseToken) {
          try {
            const { signInWithCustomToken } = await import("firebase/auth");
            await signInWithCustomToken(auth, (result as any).firebaseToken);
            console.log("Signed in to Firebase with custom token");
          } catch (firebaseErr) {
            console.error("Firebase custom token sign-in failed:", firebaseErr);
          }
        }

        // Success! Redirect based on role
        if (result.role === 'admin') {
          router.replace("/admin");
        } else if (result.role === 'doctor') {
          router.replace("/doctor");
        }
        return; // Exit on success
      } catch (apiError: any) {
        // If API login fails, try Firebase Auth for users/workers
        console.log("API login failed, trying Firebase Auth...");
      }

      // Step 2: Try Firebase Auth for users/workers
      let userEmailForAuth = form.identifier;

      // If identifier is mobile (no @), find user by phone
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
        } catch (mobileLookupErr) {
          console.error("Mobile lookup error:", mobileLookupErr);
          setError("Could not find account. Please use email address.");
          setLoading(false);
          return;
        }
      }

      // Try Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userEmailForAuth,
        form.password
      );

      const userId = userCredential.user.uid;
      await routeUser(userId);

    } catch (err: any) {
      console.error("Sign-in error:", err);

      // Handle different error types
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid credentials. Please check your email/mobile and password.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address format.");
      } else if (err.code === 'auth/configuration-not-found') {
        setError("Firebase Authentication is not configured. Please contact administrator.");
      } else if (err.message.includes('Network error')) {
        setError("Cannot connect to server. Please check if the backend is running.");
      } else {
        setError(err?.message ?? "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-800 p-4 md:p-5 rounded-lg border border-red-300 text-base font-semibold animate-in fade-in slide-in-from-top-2">
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
          placeholder="admin@test.com"
          type="text"
          required
          className="w-full"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 -mt-3 ml-1">
          Admin: email or mobile | Doctor: email only | User: email or mobile
        </p>

        <FormInput
          label="Password"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="password123"
          type="password"
          required
          className="w-full"
          disabled={loading}
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
