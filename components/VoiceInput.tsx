"use client";
import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, StopCircle } from "lucide-react";

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    placeholder?: string;
    className?: string;
    autoStop?: boolean;
    lang?: string;
    compact?: boolean;
}

export default function VoiceInput({
    onTranscript,
    placeholder = "Click microphone to start speaking...",
    className = "",
    autoStop = true,
    lang = "en-US", // Default to English
    compact = false
}: VoiceInputProps & { lang?: string, compact?: boolean }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = lang; // Use provided language

                recognition.onstart = () => {
                    setIsListening(true);
                    setError(null);
                };

                recognition.onerror = (event: any) => {
                    if (event.error === 'not-allowed') {
                        setError("Microphone access denied.");
                    } else {
                        setError("Error occurred in recognition: " + event.error);
                    }
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onresult = (event: any) => {
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        onTranscript(finalTranscript.trim());
                    }
                };

                recognitionRef.current = recognition;
            } else {
                setError("Browser does not support voice input.");
            }
        }
    }, [lang]); // Re-init on lang change usually requires more logic, but basic dep is ok.
    // Ideally we'd stop/start if lang changes but for now simple init is fine.

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (!recognitionRef.current) {
                setError("Voice input not supported.");
                return;
            }
            try {
                // Update lang just in case
                if (recognitionRef.current) recognitionRef.current.lang = lang;
                recognitionRef.current.start();
            } catch (e) {
                console.error("Failed to start recognition", e);
            }
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center justify-center transition-all duration-300 font-semibold shadow-sm border ${compact
                    ? "p-2 rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 border-transparent text-gray-600"
                    : "gap-2 px-4 py-2 rounded-full"
                    } ${isListening
                        ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                        : !compact && "bg-surface-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
            >
                {isListening ? (
                    <>
                        <StopCircle className={`${compact ? "w-5 h-5" : "w-5 h-5"}`} />
                        {!compact && <span>Listening...</span>}
                    </>
                ) : (
                    <>
                        <Mic className={`${compact ? "w-5 h-5" : "w-5 h-5"}`} />
                        {!compact && <span>Dictate</span>}
                    </>
                )}
            </button>

            {error && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200 z-10 w-48">
                    {error}
                </div>
            )}
        </div>
    );
}
