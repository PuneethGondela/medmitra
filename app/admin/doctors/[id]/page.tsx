"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DoctorProfilePage() {
    const router = useRouter();
    const params = useParams();
    const [doctor, setDoctor] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoctor = async () => {
            const token = localStorage.getItem("admin_token");
            try {
                // Note: You might need to add this endpoint to your backend if it doesn't exist yet
                // We added getDoctorById in doctor.controller.ts, ensure it's mapped in routes
                const res = await fetch(`http://localhost:4000/api/doctors/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setDoctor(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchDoctor();
        }
    }, [params.id]);

    if (loading) return <div>Loading...</div>;
    if (!doctor) return <div>Doctor not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <Button variant="outline" onClick={() => router.back()}>← Back to List</Button>
                    <div className="space-x-2">
                        {/* Placeholders for future Edit/Delete/Suspend functionality */}
                        <Button variant="destructive">Suspend Account</Button>
                        <Button>Edit Details</Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-blue-600 h-32 w-full"></div>
                    <div className="px-6 pb-6">
                        <div className="relative flex justify-between items-end -mt-12 mb-6">
                            <div className="bg-white p-1 rounded-full">
                                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500">
                                    {doctor.full_name.charAt(0)}
                                </div>
                            </div>
                            <div className="mb-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${doctor.account_status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {doctor.account_status}
                                </span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900">Dr. {doctor.full_name}</h1>
                        <p className="text-gray-500">{doctor.specialization} • {doctor.hospital_name}</p>

                        <div className="grid grid-cols-2 gap-8 mt-8">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</h3>
                                <div className="space-y-3">
                                    <p><span className="font-medium block text-gray-700">License Number:</span> {doctor.medical_license}</p>
                                    <p><span className="font-medium block text-gray-700">Mobile:</span> {doctor.mobile_number || 'N/A'}</p>
                                    <p><span className="font-medium block text-gray-700">Email:</span> {doctor.email}</p>
                                    <p><span className="font-medium block text-gray-700">Joined:</span> {new Date(doctor.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Permissions & Stats</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={doctor.can_add_visits} readOnly className="rounded text-blue-600" />
                                        <span>Can Add Visits</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={doctor.can_view_all_workers} readOnly className="rounded text-blue-600" />
                                        <span>Can View Workers</span>
                                    </div>
                                    <p className="mt-4"><span className="font-medium block text-gray-700">Last Login:</span> {doctor.last_login ? new Date(doctor.last_login).toLocaleString() : 'Never'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
