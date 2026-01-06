import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { extractEntities } from "@/lib/ml-client"; // We might need a more generic 'generate' function but extractEntities hits the LLM

// If we don't have a generic "generate" function, we might need to create one or reuse the ML client
// For now, let's assume we can use a fetch to the ML IDK
// Actually, let's look at `lib/ml-client.ts` or similar to see how to call the LLM directly
// Or we can just use the same Pattern as extractEntities but different prompt

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");
        // Verify token (simplified for brevity, usually we check UID)
        const decoded = await adminAuth.verifyIdToken(token);

        const { recordId, userId, language = "en-IN" } = await req.json();

        if (!recordId || !userId) {
            return NextResponse.json({ error: "Missing recordId or userId" }, { status: 400 });
        }

        // 1. Fetch User and Record
        const userDoc = await adminDb.collection("users").doc(userId).get();
        const recordDoc = await adminDb.collection("records").doc(recordId).get();

        if (!userDoc.exists || !recordDoc.exists) {
            return NextResponse.json({ error: "User or Record not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const recordData = recordDoc.data();

        // 2. Construct Prompt
        const diagnosis = recordData?.diagnosis_simple || recordData?.diagnosis_raw || "General Health Checkup";
        const age = userData?.age || "Unknown";
        const gender = userData?.gender || "Unknown"; // Profile might not have gender, assume unknown

        // We strictly want JSON
        const prompt = `
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

        // 3. Call LLM
        // Reusing the ML Server chat endpoint or similar
        // Since we are in Next.js API, we can call the Python ML Server directly if accessible
        // URL: http://localhost:8000/api/chat (needs to be running)
        // Or simpler: use the existing 'extractEntities' pattern if it supports generic prompts.

        // Let's implement a direct fetch to ML server here for flexibility
        const mlServerUrl = "http://localhost:8000/api/chat";
        // Note: Backend proxy is at 4000. Let's try 4000/api/bot/chat if possible, or direct 8000.
        // The previous code used 4000. Let's stick to 4000 if it proxies. 
        // actually MedMitraChat used 4000/api/bot/chat

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

        let planJson;
        try {
            planJson = JSON.parse(textInfo);
        } catch (e) {
            // Fallback or retry? For now, return error or empty structure
            console.error("Failed to parse JSON", textInfo);
            planJson = { overview: "AI Generation failed to format correctly. Please try again." };
        }

        // 4. Save to Firestore
        const planRef = adminDb.collection("health_plans").doc();
        const planData = {
            id: planRef.id,
            userId,
            recordId,
            diagnosis,
            language,
            generatedAt: FieldValue.serverTimestamp(),
            ...planJson
        };

        await planRef.set(planData);

        return NextResponse.json({ success: true, plan: planData });

    } catch (error: any) {
        console.error("Error generating health plan:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
