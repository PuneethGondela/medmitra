// utils/language.ts
// Supported languages for Med Mitra workers.
// Used for UI selection + voice playback.

export const LANGUAGES = [
    { code: "hi-IN", label: "Hindi" },
    { code: "te-IN", label: "Telugu" },
    { code: "or-IN", label: "Odia" },
    { code: "en-IN", label: "English" }
  ];
  
  export function getLanguageLabel(code: string): string {
    const lang = LANGUAGES.find((l) => l.code === code);
    return lang ? lang.label : "Unknown";
  }
  