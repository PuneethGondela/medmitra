"use client";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MitrAIPage() {
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Browser does not support speech recognition. Try Chrome.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            handleAnalyze(new Event('submit') as any, transcript);
        };

        recognition.start();
    };

    const playTTS = async (text: string) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("http://localhost:4000/api/bot/tts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ text })
            });

            if (!res.ok) throw new Error("TTS failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
            }
        } catch (err) {
            console.error("TTS Error:", err);
        }
    };

    const handleAnalyze = async (e: React.FormEvent, overrideQuery?: string) => {
        if (e) e.preventDefault();
        const q = overrideQuery || query;
        if (!q) return;

        setLoading(true);
        setError(null);
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setQuery("");

        const token = localStorage.getItem("admin_token");

        try {
            const res = await fetch("http://localhost:4000/api/bot/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ query: q }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Analysis failed");

            setMessages(prev => [...prev, { role: 'bot', text: data.analysis }]);

            // Auto-play TTS for the response
            await playTTS(data.analysis);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-purple-600 text-white p-2 rounded-lg text-2xl">🤖</div>
                    <h1 className="text-2xl font-bold text-gray-900">Mitr AI Monitor (Voice Enabled)</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="col-span-2 space-y-4">
                        <div className="bg-white rounded-lg shadow-sm border p-4 min-h-[500px] flex flex-col">
                            <div className="flex-1 bg-gray-50 rounded p-4 mb-4 overflow-y-auto space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-gray-400 text-center mt-10">
                                        <p>Mitr AI is listening.</p>
                                        <button onClick={startListening} className="mt-4 bg-purple-100 text-purple-700 px-4 py-2 rounded-full hover:bg-purple-200 transition flex items-center gap-2 mx-auto">
                                            🎤 Click to Speak
                                        </button>
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-100 text-gray-800'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}

                                {loading && <div className="text-gray-400 text-sm animate-pulse">Thinking...</div>}
                            </div>

                            <form onSubmit={(e) => handleAnalyze(e)} className="flex gap-2">
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Type or use voice..."
                                    disabled={loading}
                                    className="flex-1"
                                />
                                <Button type="button" onClick={startListening} variant={isListening ? "destructive" : "outline"}>
                                    {isListening ? "Listening..." : "🎤"}
                                </Button>
                                <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                                    Send
                                </Button>
                            </form>

                            <audio ref={audioRef} className="hidden" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <h3 className="font-semibold text-gray-700 mb-2">Voice Mode</h3>
                            <p className="text-sm text-gray-600">
                                Click the microphone icon to speak. Mitr AI will reply with voice.
                            </p>
                        </div>
                        {/* Status Panel */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <h3 className="font-semibold text-gray-700 mb-2">System Status</h3>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Secure & Monitored
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
