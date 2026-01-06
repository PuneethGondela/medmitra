// utils/voice.ts

export function speakHealthRecord(text: string, locale: string): boolean {
  if (typeof window === "undefined") return false;
  if (!("speechSynthesis" in window)) return false;

  try {
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text || "");
    utter.lang = locale;
    utter.rate = 0.9;
    utter.pitch = 1.0;

    window.speechSynthesis.speak(utter);
    return true;
  } catch (err) {
    console.error("TTS error", err);
    return false;
  }
}
