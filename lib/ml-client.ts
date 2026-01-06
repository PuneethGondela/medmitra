export const analyzeImage = async (file: File) => {
    return "Analysis not implemented yet";
};

export const chatWithBot = async (query: string) => {
    return "Chat not available";
};

export const extractEntities = async (text: string) => {
    return {
        entities: {
            symptoms: [],
            diagnosis: null,
            medications: []
        }
    };
};

export interface NERResult {
    entities: string[];
    medicines: {
        name: string;
        dosage?: string;
        frequency?: string;
    }[];
}

export const translateText = async (text: string, count: string, source: string = "en", debug: boolean = false) => { // keeping signature for compatibility, count is unused if not needed, or mapped to tgt_lang
    try {
        const tgt_lang = count; // Assuming 'count' parameter in original code was actually target language code based on usage in PrescriptionBox (it passes langCode)
        const res = await fetch('http://localhost:4000/api/bot/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, src_lang: source, tgt_lang })
        });
        if (!res.ok) throw new Error("Translation request failed");
        const data = await res.json();
        return { translation: data.translated_text, error: null };
    } catch (e) {
        console.error("Translation client error:", e);
        return { translation: text, error: e };
    }
};

export const speakText = async (text: string): Promise<Blob | null> => {
    try {
        const res = await fetch('http://localhost:4000/api/bot/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error("TTS request failed");
        return await res.blob();
    } catch (e) {
        console.error("TTS client error:", e);
        return null;
    }
};

export const extractMedicalInfo = async (text: string): Promise<NERResult> => {
    return { entities: [], medicines: [] };
};

export const extractPrescriptionData = async (text: string) => {
    return [];
};

export interface AdherencePrediction {
    score: number;
    risk_score: number;
    riskLevel: string;
    risk_level: string;
    factors: string[];
    risk_factors: string[];
    recommendation: string;
}

export const predictAdherence = async (data: any): Promise<AdherencePrediction> => {
    return {
        score: 95,
        risk_score: 95,
        riskLevel: "Low",
        risk_level: "Low",
        factors: [],
        risk_factors: ["Missed appointment", "Side effects"],
        recommendation: "Continue current medication schedule and monitor side effects."
    };
};

export const mlClient = {
    extractEntities,
    translateText,
    analyzeImage,
    extractMedicalInfo,
    extractPrescriptionData,
    predictAdherence
};

export interface NEREntity {
    text: string;
    label: string;
    start: number;
    end: number;
}
