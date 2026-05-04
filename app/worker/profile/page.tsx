// app/worker/profile/page.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useEffect, useState } from "react";
import { getCurrentUser, getDocument } from "../../../lib/firebase-helpers";
import { useRouter } from "next/navigation";
import LogoutButton from "../../../components/LogoutButton";
import Link from "next/link";
import { useTranslation } from "../../providers";

export default function WorkerProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    language: "hi-IN",
  });

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      const uid = user?.uid ?? null;
      setUserId(uid);

      if (uid) {
        const data: any = await getDocument("users", uid);

        if (data) {
          setProfile({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            emergency_contact: data.emergency_contact || "",
            emergency_phone: data.emergency_phone || "",
            language: data.language || "hi-IN",
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">👤</div>
          <div className="text-gray-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-medium">
        <h1 className="text-2xl font-bold text-white">👤 My Profile</h1>
        <div className="flex gap-2">
          <Link
            href="/worker"
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Back
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="card space-y-4">
        {/* Read-only notice */}
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-warning-900 mb-1">Read-Only Profile</h3>
              <p className="text-sm text-warning-800">
                Your profile information is managed by your doctor. 
                Please contact your doctor if you need to update any information.
              </p>
            </div>
          </div>
        </div>

        {/* Read-only profile display */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Full Name
            </label>
            <div className="input-field bg-gray-50 text-gray-900">
              {profile.name || "—"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <div className="input-field bg-gray-50 text-gray-900">
              {profile.email || "—"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Phone Number
            </label>
            <div className="input-field bg-gray-50 text-gray-900">
              {profile.phone || "—"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Address
            </label>
            <div className="input-field bg-gray-50 text-gray-900 min-h-[80px]">
              {profile.address || "—"}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-700 mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Contact Name
                </label>
                <div className="input-field bg-gray-50 text-gray-900">
                  {profile.emergency_contact || "—"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Contact Phone
                </label>
                <div className="input-field bg-gray-50 text-gray-900">
                  {profile.emergency_phone || "—"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Preferred Language
            </label>
            <div className="input-field bg-gray-50 text-gray-900">
              {profile.language === "hi-IN" && "हिंदी (Hindi)"}
              {profile.language === "en-IN" && "English"}
              {profile.language === "te-IN" && "తెలుగు (Telugu)"}
              {profile.language === "or-IN" && "ଓଡ଼ିଆ (Odia)"}
              {!["hi-IN", "en-IN", "te-IN", "or-IN"].includes(profile.language) && profile.language}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
