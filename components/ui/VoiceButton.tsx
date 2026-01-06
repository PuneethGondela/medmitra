import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Volume2, Loader2, Square } from 'lucide-react';

interface VoiceButtonProps {
    text?: string;
    language?: string;
    compact?: boolean;
    className?: string;
    onClick?: () => void;
}

import { speakText } from '@/lib/ml-client';

export default function VoiceButton({ text, language = 'en', compact, className, onClick }: VoiceButtonProps) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audio) {
                audio.pause();
                audio.src = "";
            }
        };
    }, [audio]);

    const handleClick = async () => {
        if (onClick) onClick();

        // Stop if currently speaking
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            setIsSpeaking(false);
            return;
        }

        if (!text) return;

        // PRIORITIZE SERVER TTS for Indian Languages (hi, te, ta, mr, bn, gu, kn, ml)
        // because browser support for these is often poor on desktops.
        const isIndianAuth = ['hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml'].some(code => language.startsWith(code));

        if (isIndianAuth) {
            setIsLoading(true);
            try {
                const audioBlob = await speakText(text);
                if (audioBlob) {
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const newAudio = new Audio(audioUrl);

                    newAudio.onended = () => {
                        setIsSpeaking(false);
                        URL.revokeObjectURL(audioUrl); // cleanup
                    };

                    newAudio.onerror = () => {
                        console.error("Audio playback failed, falling back to browser");
                        setIsSpeaking(false);
                        playBrowserTTS(); // Fallback
                    };

                    setAudio(newAudio);
                    setIsSpeaking(true);
                    newAudio.play();
                    setIsLoading(false);
                    return; // Server TTS started successfully
                }
            } catch (err) {
                console.error("Server TTS failed", err);
                // Fallback will happen below
            } finally {
                setIsLoading(false);
            }
        }

        // FALLBACK / STANDARD BROWSER TTS
        playBrowserTTS();
    };

    const playBrowserTTS = () => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Browser voice selection logic
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.startsWith(language));

        if (!selectedVoice && (language.includes('hi') || language.includes('te'))) {
            selectedVoice = voices.find(v => v.lang.includes('IN'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = language;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    return (
        <Button
            onClick={handleClick}
            variant={isSpeaking ? "destructive" : "outline"}
            size={compact ? "sm" : "default"}
            disabled={isLoading}
            className={`${className} flex items-center gap-2 transition-all`}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSpeaking ? (
                <>
                    <Square className="w-4 h-4 animate-pulse" fill="currentColor" />
                    {!compact && "Stop"}
                </>
            ) : (
                <>
                    <Volume2 className="w-4 h-4" />
                    {!compact && "Speak Twin"}
                </>
            )}
        </Button>
    );
}
