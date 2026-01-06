// app/login/page.tsx
"use client";
import React from "react";
import Link from "next/link";
import LoginForm from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-800 rounded-xl mb-6 shadow-md">
              <span className="text-4xl">🏥</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-slate-900">
              Welcome Back
            </h1>
            <p className="text-slate-700 font-semibold text-lg">Sign in to access your health records</p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Register Link */}
          <div className="mt-8 pt-8 border-t-2 border-slate-300">
            <p className="text-base text-slate-700 mb-4 text-center font-semibold">
              New to Med Mitra?
            </p>
            <Link
              href="/register"
              className="block w-full text-center px-6 py-3 bg-white text-primary-800 border-2 border-slate-400 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-600 active:scale-95 transition-all duration-200 shadow-sm"
            >
              Create Free Account
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 font-semibold">Secure • Private • Offline-First</p>
        </div>
      </div>
    </div>
  );
}
