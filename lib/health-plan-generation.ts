export interface HealthPlanPromptParams {
    age: string | number;
    gender: string;
    diagnosis: string;
    language: string;
}

export function buildHealthPlanPrompt(params: HealthPlanPromptParams): string {
    const { age, gender, diagnosis, language } = params;
    return `
      Act as a medical expert AI. Create a "Cure Map" (Health Journey Plan) for a patient.

      Patient Details:
      - Age: ${age}
      - Gender: ${gender}
      - Diagnosis: "${diagnosis}"
      - Language: ${language} (Output content in this language, but keep JSON keys in English)

      Requirements:
      1. Schedule: A timeline of doctor visits or milestones (e.g. Weeks 1-4).
      2. Diet: Specific food recommendations (Morning, Afternoon, Evening, Avoid). Focus on safety.
      3. Exercises: Safe physical activities.
      4. Safety: Crucial warnings (especially for Pregnancy or serious conditions).

      Output correctly formatted JSON ONLY (no markdown, no backticks). Structure:
      {
        "overview": "Brief summary string",
        "schedule": [ { "week": 1, "title": "...", "activities": ["..."] } ],
        "diet": [ { "category": "Morning", "items": ["..."] } ],
        "exercises": [ { "name": "...", "duration": "...", "frequency": "..." } ],
        "safety_precautions": ["..."]
      }
    `;
}

export async function generateHealthPlanFromLLM(prompt: string): Promise<any> {
    const mlResponse = await fetch("http://localhost:4000/api/bot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
            temperature: 0.1, // more deterministic
            role: "doctor" // context
        })
    });

    if (!mlResponse.ok) {
        throw new Error("Failed to generate plan from AI");
    }

    const mlData = await mlResponse.json();
    let textInfo = mlData.response || "";

    // Clean markdown if present
    textInfo = textInfo.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(textInfo);
    } catch (e) {
        console.error("Failed to parse JSON", textInfo);
        return { overview: "AI Generation failed to format correctly. Please try again." };
    }
}
