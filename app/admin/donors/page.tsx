"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function DonorListPage() {
    const router = useRouter();
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");

    useEffect(() => {
        const fetchDonors = async () => {
            setLoading(true);
            const token = localStorage.getItem("admin_token");
            if (!token) return router.push("/admin/login");

            try {
                let url = "http://localhost:4000/api/donors?";
                if (selectedGroup) url += `bloodGroup=${encodeURIComponent(selectedGroup)}`;

                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setDonors(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDonors();
    }, [selectedGroup, router]);

    const filteredDonors = donors.filter((d: any) =>
        d.full_name.toLowerCase().includes(search.toLowerCase()) ||
        d.city.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">🩸</span>
                        <h1 className="text-2xl font-bold text-gray-900">Blood Bank Registry</h1>
                    </div>
                    {/* <Button>+ Register Donor</Button> */}
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex gap-4 flex-wrap">
                    <Input
                        placeholder="Search by name or city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md"
                    />
                    <div className="flex gap-2">
                        {BLOOD_GROUPS.map(bg => (
                            <button
                                key={bg}
                                onClick={() => setSelectedGroup(selectedGroup === bg ? "" : bg)}
                                className={`px-3 py-1 rounded text-sm font-medium transition ${selectedGroup === bg ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {bg}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donor Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredDonors.map((donor: any) => (
                                    <tr key={donor.donor_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{donor.full_name}</div>
                                            <div className="text-xs text-gray-500">{donor.age} yrs • {donor.gender}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-sm font-bold rounded bg-red-50 text-red-700 border border-red-200">
                                                {donor.blood_group}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.city}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.mobile_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${donor.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {donor.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDonors.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No donors found matching criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
