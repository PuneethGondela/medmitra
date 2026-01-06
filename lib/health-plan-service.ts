import { db } from "./firebase";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    doc,
    getDoc
} from "firebase/firestore";

export interface HealthPlan {
    id?: string;
    userId: string;
    recordId: string;
    diagnosis: string;
    severity: "low" | "medium" | "high";
    generatedAt: Timestamp;
    language: string;

    // Plan Content
    overview: string;
    schedule: {
        week: number;
        title: string;
        activities: string[];
        upcomingVisit?: {
            suggestedDate: string;
            reason: string;
        };
    }[];
    diet: {
        category: "Morning" | "Afternoon" | "Evening" | "Avoid";
        items: string[];
    }[];
    exercises: {
        name: string;
        duration: string;
        frequency: string;
        videoUrl?: string; // Optional for future
    }[];
    safety_precautions: string[];
}

const COLLECTION_NAME = "health_plans";

/**
 * Save a generated health plan to Firestore
 */
export async function saveHealthPlan(plan: Omit<HealthPlan, "id">) {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), plan);
        return { id: docRef.id, ...plan };
    } catch (error) {
        console.error("Error saving health plan:", error);
        throw error;
    }
}

/**
 * Get the latest health plan for a specific user, optionally linked to a specific record
 */
export async function getHealthPlan(userId: string, recordId?: string) {
    try {
        const token = await (await import("./firebase-auth-helpers")).getCurrentUser().then(u => u?.getIdToken());
        if (!token) return null; // Cannot fetch if not logged in

        const params = new URLSearchParams({ userId });
        if (recordId) params.append("recordId", recordId);

        const res = await fetch(`/api/get-health-plan?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            console.warn("Failed to fetch health plan API:", res.statusText);
            return null;
        }

        const data = await res.json();
        return data.plan || null;
    } catch (error) {
        console.error("Error fetching health plan:", error);
        return null;
    }
}
