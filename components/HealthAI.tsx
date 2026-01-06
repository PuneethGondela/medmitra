import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
import VoiceInput from "./VoiceInput";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useTranslation } from "@/app/providers";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

interface HealthAIProps {
    locale: string;
    userId?: string | null;
    records?: any[];
    userName?: string;
}

// Simple Markdown Formatter
const FormatMessage = ({ content }: { content: string }) => {
    // 1. Remove raw markdown symbols that look bad (like ##)
    let formatted = content.replace(/#{1,6}\s?/g, '');

    // 2. Handle Bold (**text**)
    const parts = formatted.split(/(\*\*.*?\*\*)/g);

    return (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
};

export default function HealthAI({ locale, userId, records = [], userName }: HealthAIProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const API_URL = "http://localhost:4000/api/bot";

    useEffect(() => {
        // Initial Greeting if empty
        if (messages.length === 0) {
            setMessages([{
                role: "assistant",
                content: t("ai_greeting_mitr") !== "ai_greeting_mitr" ? t("ai_greeting_mitr") : "Hello! I am Mitr AI. How can I help you?"
            }]);
        }
    }, [userName, t, messages.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // ... (existing imports)

    // ...

    const speak = (text: string, lang: string) => {
        if (typeof window === "undefined") return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);

        setInput("");
        setIsLoading(true);

        try {
            const contextMessages: Message[] = [];
            if (records.length > 0) {
                contextMessages.push({
                    role: "system",
                    content: `Current User Health Records Context: ${JSON.stringify(records.slice(0, 3), null, 2)}`
                });
            }

            const apiMessages = [
                ...contextMessages,
                ...messages.filter(m => m.role !== 'system'),
                userMessage
            ].map(m => ({ role: m.role, content: m.content }));

            const payload = {
                messages: apiMessages,
                max_tokens: 800,
                temperature: 0.7,
                role: "worker",
                userId: userId || undefined,
                language: locale
            };

            const res = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed");

            const data = await res.json();
            const responseText = data.response;
            setMessages(prev => [...prev, { role: "assistant", content: responseText }]);

            speak(responseText, locale);  // Speak response

        } catch (error) {
            console.error("HealthAI Error:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I'm having trouble connecting to the server. Please try again later."
            }]);
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
                        className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden font-sans"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 flex items-center justify-between text-white shadow-md shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <Bot size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Mitr AI</h3>
                                    <div className="flex items-center gap-1.5 opacity-90 text-xs font-medium">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        {t("online_status")} • {locale.split('-')[0].toUpperCase()}
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

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/80">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 px-4 shadow-sm ${msg.role === "user"
                                        ? "bg-primary-600 text-white rounded-tr-none"
                                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                                        }`}>
                                        <FormatMessage content={msg.content} />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-1">
                                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Footer */}
                        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                                <div className="flex-1 relative">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder={t("ask_ai_placeholder")}
                                        disabled={isLoading}
                                        className="border-0 bg-transparent focus-visible:ring-0 shadow-none px-4 py-3 pr-24"
                                    />
                                    <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
                                        <VoiceInput
                                            lang={locale || "en-US"}
                                            onTranscript={(text) => setInput(text)}
                                            className="scale-90 origin-right"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    size="icon"
                                    className="h-10 w-10 rounded-lg bg-primary-600 hover:bg-primary-700 shrink-0 mr-1"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                                {t("ai_mistake_warning")}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full shadow-lg hover:shadow-primary-500/50 transition-all duration-300 border-2 border-white/20"
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </motion.button>
        </>
    );
}
