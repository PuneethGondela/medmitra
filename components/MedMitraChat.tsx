"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Cpu, Mic, User, Shield, Stethoscope, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import VoiceInput from "./VoiceInput";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useTranslation } from "@/app/providers";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

type BotRole = "admin" | "doctor" | "user" | "worker";

// Simple Markdown Formatter
const FormatMessage = ({ content }: { content: string }) => {
    // 1. Remove raw markdown symbols that look bad (like ##)
    let formatted = content.replace(/#{1,6}\s?/g, '');

    // 2. Handle Bold (**text**)
    const parts = formatted.split(/(\*\*.*?\*\*)/g);

    return (
        <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
};

export default function MedMitraChat() {
    const { t, locale } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [botRole, setBotRole] = useState<BotRole>("user");
    const [userId, setUserId] = useState<string | null>(null);
    const [userRecords, setUserRecords] = useState<any[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use Node.js Backend Proxy (Port 4000) instead of direct ML Server (Port 8000)
    const API_URL = "http://localhost:4000/api/bot";

    // Detect user role and load user data
    useEffect(() => {
        const detectRole = async () => {
            // Check for admin token
            const adminToken = localStorage.getItem("admin_token");
            const doctorToken = localStorage.getItem("doctor_token");

            if (adminToken) {
                setBotRole("admin");
                setMessages([{
                    role: "assistant",
                    content: "🔒 Hello! I am Mitr AI. I can help you monitor system security, analyze user activity, and manage doctors. How can I assist you today?"
                }]);
                return;
            }

            if (doctorToken) {
                setBotRole("doctor");
                setMessages([{
                    role: "assistant",
                    content: "👨‍⚕️ Hello! I am Mitr AI. I can help you find blood donors, manage patients, and access medical resources. What do you need today?"
                }]);
                return;
            }

            // Check for Firebase user (worker/user)
            try {
                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        setBotRole("worker");
                        setUserId(user.uid);

                        // Fetch user health records for context from Firestore
                        try {
                            const recordsQuery = query(
                                collection(db, 'records'),
                                where('worker_id', '==', user.uid),
                                orderBy('visit_date', 'desc'),
                                limit(10)
                            );
                            const recordsSnapshot = await getDocs(recordsQuery);
                            const records = recordsSnapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));

                            if (records.length > 0) {
                                setUserRecords(records);
                            }
                        } catch (recordsError) {
                            console.error("Error fetching records:", recordsError);
                        }

                        setMessages([{
                            role: "assistant",
                            content: "💚 Hello! I am Mitr AI. I can provide health suggestions, remedies, diet plans, and help manage your health journey. How can I help you today?"
                        }]);
                    } else {
                        setMessages([{
                            role: "assistant",
                            content: "Hello! I am Mitr AI. How can I assist you today?"
                        }]);
                    }
                });

                // Cleanup subscription
                return () => unsubscribe();
            } catch (error) {
                console.error("Error detecting role:", error);
                setMessages([{
                    role: "assistant",
                    content: "Hello! I am Mitr AI. How can I assist you today?"
                }]);
            }
        };

        detectRole();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);


    // Text-to-Speech Helper
    const speak = (text: string, lang: string) => {
        if (typeof window === "undefined") return;
        window.speechSynthesis.cancel(); // Stop previous
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput("");
        setIsLoading(true);

        try {
            // Prepare messages with context...
            // (Same context logic)
            const apiMessages = messages
                .filter(m => m.role !== 'system')
                .concat(userMessage)
                .map(m => ({ role: m.role, content: m.content }));

            if (botRole === "worker" && userRecords.length > 0) {
                const recordsContext = {
                    role: "system",
                    content: `User Health Records Context: ${JSON.stringify(userRecords.slice(0, 5), null, 2)}`
                };
                apiMessages.unshift(recordsContext as any);
            }

            const payload = {
                messages: apiMessages,
                max_tokens: 1024,
                temperature: 0.7,
                role: botRole,
                userId: userId || undefined,
                language: locale // Send current language
            };

            const token = localStorage.getItem("admin_token") || localStorage.getItem("doctor_token");
            const headers: any = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to fetch response");
            }

            const data = await res.json();
            const responseText = data.response || "I'm sorry, I couldn't process that request.";
            const botMessage: Message = { role: "assistant", content: responseText };

            setMessages((prev) => [...prev, botMessage]);

            // Speak the response
            speak(responseText, locale || "en-US");

        } catch (error: any) {
            console.error("Chat error:", error);
            const errorMsg = `Sorry, I'm having trouble right now. ${error.message || "Please check servers."}`;
            setMessages((prev) => [...prev, {
                role: "assistant",
                content: errorMsg
            }]);
            speak(errorMsg, "en-US"); // Default error speech
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-20 right-4 w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(80vh)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 flex items-center justify-between text-white shrink-0 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <Cpu size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">
                                        Mitr AI
                                    </h3>
                                    <div className="flex items-center gap-1.5 opacity-90 text-xs">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        {botRole === "admin" && "Security Mode"}
                                        {botRole === "doctor" && "Doctor Mode"}
                                        {(botRole === "user" || botRole === "worker") && t("health_mode")}
                                        {!botRole && "Online"}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === "user"
                                            ? "bg-teal-600 text-white rounded-tr-none shadow-md"
                                            : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                                            }`}
                                    >
                                        {/* Markdown support */}
                                        <FormatMessage content={msg.content} />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex items-end gap-2"
                            >
                                <div className="flex-1 relative">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={
                                            botRole === "admin" ? "Ask about security..."
                                                : botRole === "doctor" ? "Ask about patients..."
                                                    : t("ask_ai_placeholder")
                                        }
                                        className="pr-10 max-h-32 min-h-[50px] py-3"
                                    />
                                    <div className="absolute right-2 bottom-2 flex items-center gap-2">
                                        <VoiceInput
                                            lang={locale || "en-US"}
                                            onTranscript={(text) => setInput(text)}
                                            className="scale-90"
                                            compact={true}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-[50px] w-[50px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shrink-0 transition-colors"
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send size={20} />
                                </Button>
                            </form>
                            <div className="text-xs text-center text-slate-400 mt-2">
                                {t("ai_disclaimer") || "Med Mitra can make mistakes. Verify important info."}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-teal-500 hover:to-emerald-500 transition-all duration-300 border-2 border-white/20"
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </motion.button>
        </>
    );
}
