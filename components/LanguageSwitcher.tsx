// components/LanguageSwitcher.tsx
"use client";

import React, { useState } from "react";
import { LANGUAGES } from "../utils/language";
import { useTranslation } from "../app/providers";
import { Locale } from "../utils/i18n";

export default function LanguageSwitcher({ userId, current }: { userId: string; current: string }) {
  const { locale, setLocale } = useTranslation();
  const [saving, setSaving] = useState(false);

  async function handleLanguageChange(next: string) {
    setSaving(true);
    try {
      await setLocale(next as Locale);
    } catch (error) {
      console.error("Error changing language:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 card">
      <h3 className="font-medium mb-2 text-gray-900">Preferred Language</h3>

      <select
        className="input-field"
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        disabled={saving}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>

      {saving && <p className="text-xs text-gray-500 mt-2">Saving…</p>}
    </div>
  );
}
