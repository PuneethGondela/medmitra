"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function WorkerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const [worker, setWorker] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorker = async () => {
            const token = localStorage.getItem("admin_token");
            try {
                const res = await fetch(`http://localhost:4000/api/workers/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setWorker(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchWorker();
        }
    }, [params.id]);

    if (loading) return <div>Loading...</div>;
    if (!worker) return <div>Worker not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <Button variant="outline" onClick={() => router.back()} className="mb-4">← Back to List</Button>

                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-pink-600 h-32 w-full"></div>
                    <div className="px-6 pb-6">
                        <div className="relative flex justify-between items-end -mt-12 mb-6">
                            <div className="bg-white p-1 rounded-full">
                                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500">
                                    {worker.full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mb-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${worker.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {worker.status}
                                </span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900">{worker.full_name}</h1>
                        <p className="text-gray-500">Social Health Activist (ASHA) • {worker.assigned_village}</p>

                        <div className="grid grid-cols-2 gap-8 mt-8">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact Info</h3>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Mobile:</span> {worker.mobile_number}</p>
                                    <p><span className="font-medium">Email:</span> {worker.email || "N/A"}</p>
                                    <p><span className="font-medium">Joined:</span> {new Date(worker.joined_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Performance (Mock)</h3>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Patients Registered:</span> 0</p>
                                    <p><span className="font-medium">Visits this month:</span> 0</p>
                                    <p><span className="font-medium">Response Rate:</span> 100%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
