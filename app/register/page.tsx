// app/register/page.tsx
"use client";
import React from "react";
import RegisterForm from "../../components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-800 rounded-xl mb-6 shadow-md">
              <span className="text-4xl">🏥</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-slate-900">
              Join Med Mitra
            </h1>
            <p className="text-slate-700 font-semibold text-lg">
              Create your health wallet - Free, Secure, Offline-First
            </p>
          </div>

          {/* Features Card - High Contrast */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-6 mb-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📱</div>
              <div className="flex-1">
                <strong className="text-slate-900 font-bold text-lg mb-3 block">Why Med Mitra?</strong>
                <ul className="space-y-3 text-base text-slate-800 font-semibold">
                  <li className="flex items-center gap-3">
                    <span className="text-secondary-600 font-bold text-xl">✓</span>
                    <span>Access your health records offline, anywhere</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-secondary-600 font-bold text-xl">✓</span>
                    <span>Voice playback in your language (Hindi, Telugu, Odia, English)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-secondary-600 font-bold text-xl">✓</span>
                    <span>Digital storage for X-rays and lab reports</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Register Form */}
          <RegisterForm />
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 font-semibold">Secure • Private • Offline-First</p>
        </div>
      </div>
    </div>
  );
}

