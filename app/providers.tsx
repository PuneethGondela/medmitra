"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { t, Locale } from "../utils/i18n";

// Type definition for the translation context
interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<TranslationContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("hi-IN");
  const [isLoading, setIsLoading] = useState(true);

  // Load user's language preference on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const language = userData?.language;
            if (language && ["en-IN", "hi-IN", "te-IN", "or-IN"].includes(language)) {
              setLocaleState(language as Locale);
            }
          }
        }
      } catch (error) {
        console.error("Error loading user language:", error);
      } finally {
        setIsLoading(false);
      }
    });

    // If no user, stop loading
    if (!auth.currentUser) {
      setIsLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Centralized setLocale that updates both state and database
  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          language: newLocale,
          updated_at: new Date(),
        });
      }
    } catch (error) {
      console.error("Error saving language preference:", error);
    }
  }, []);

  const value: TranslationContextValue = {
    locale,
    setLocale,
    t: (key: string, params?: Record<string, string | number>) => t(locale, key, params),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const context = useContext(LanguageContext);
  
  if (!context) {
    // Fallback for components used outside provider (shouldn't happen, but safe fallback)
    return {
      locale: "hi-IN" as Locale,
      setLocale: async () => {},
      t: (key: string, params?: Record<string, string | number>) => key,
    };
  }
  
  return context;
}
