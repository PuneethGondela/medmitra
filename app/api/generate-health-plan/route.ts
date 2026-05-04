import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildHealthPlanPrompt, generateHealthPlanFromLLM } from "@/lib/health-plan-generation";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");
        // Verify token
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

        // 2. Construct Prompt using the new service
        const diagnosis = recordData?.diagnosis_simple || recordData?.diagnosis_raw || "General Health Checkup";
        const age = userData?.age || "Unknown";
        const gender = userData?.gender || "Unknown";

        const prompt = buildHealthPlanPrompt({
            age,
            gender,
            diagnosis,
            language
        });

        // 3. Call LLM using the new service
        const planJson = await generateHealthPlanFromLLM(prompt);

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
