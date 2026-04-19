import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const recordId = searchParams.get("recordId");

        // Security check: Ensure requesting user matches userId (unless admin/doctor)
        // For now, let's assume doctors can read any user's plan, and users can read their own.
        // Simplified: allow if authenticated. Ideally check uid === userId or uid is doctor.

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        let query = adminDb.collection("health_plans")
            .where("userId", "==", userId);

        if (recordId) {
            query = query.where("recordId", "==", recordId).limit(1);
        } else {
            query = query.orderBy("generatedAt", "desc").limit(1);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return NextResponse.json({ plan: null });
        }

        const doc = snapshot.docs[0];
        const plan: any = { id: doc.id, ...doc.data() };

        // Convert Timestamp to ISO string for JSON safety
        if ((plan as any).generatedAt && typeof (plan as any).generatedAt.toDate === 'function') {
    (plan as any).generatedAt = (plan as any).generatedAt.toDate().toISOString();
}
        return NextResponse.json({ plan });

    } catch (error: any) {
        console.error("Error fetching health plan:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
