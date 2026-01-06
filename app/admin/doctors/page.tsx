"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Search, Plus, Stethoscope, Building, FileText, CheckCircle, XCircle } from "lucide-react";

export default function DoctorListPage() {
    const router = useRouter();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchDoctors = async () => {
            const token = localStorage.getItem("admin_token");
            if (!token) return router.push("/admin/login");

            try {
                const res = await fetch("http://localhost:4000/api/doctors", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setDoctors(data);
                } else {
                    console.error("Failed to fetch doctors");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, [router]);

    const filteredDoctors = doctors.filter((d: any) =>
        d.full_name.toLowerCase().includes(search.toLowerCase()) ||
        d.medical_license.toLowerCase().includes(search.toLowerCase()) ||
        d.hospital_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Premium Header */}
            <div className="gradient-hero text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                                <Stethoscope className="w-8 h-8 opacity-90" />
                                Doctor Management
                            </h1>
                            <p className="text-primary-100 mt-2 font-medium">
                                Manage registered doctors and their credentials
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push("/admin/doctors/new")}
                            className="bg-white text-primary-800 hover:bg-slate-100 font-bold px-6 py-5 rounded-xl shadow-md transition-all hover:shadow-lg flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add New Doctor
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-8">
                {/* Search Bar - Glass Effect */}
                <div className="bg-white rounded-xl shadow-lg p-2 flex items-center gap-4 mb-8 border border-slate-100 max-w-2xl mx-auto animate-in slide-in-from-top-4 duration-500">
                    <div className="pl-4 text-slate-400">
                        <Search className="w-5 h-5" />
                    </div>
                    <Input
                        placeholder="Search by name, license, or hospital..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-none focus-visible:ring-0 text-lg py-6 bg-transparent placeholder:text-slate-400"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden animate-in slide-in-from-top-8 duration-700 fill-mode-backwards delay-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">License</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {filteredDoctors.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No doctors found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDoctors.map((doc: any) => (
                                            <tr key={doc.doctor_id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                                                            {doc.full_name.charAt(0)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-slate-900">{doc.full_name}</div>
                                                            <div className="text-xs font-medium text-slate-500">{doc.specialization}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-slate-600 font-medium">
                                                        <FileText className="w-4 h-4 mr-2 opacity-50" />
                                                        {doc.medical_license}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-slate-600 font-medium">
                                                        <Building className="w-4 h-4 mr-2 opacity-50" />
                                                        {doc.hospital_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full items-center gap-1 ${doc.account_status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-red-100 text-red-700 border border-red-200'
                                                        }`}>
                                                        {doc.account_status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {doc.account_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        className="text-primary-600 hover:text-primary-900 font-bold hover:bg-primary-50 px-3 py-1 rounded-lg transition-colors mr-2"
                                                        onClick={() => router.push(`/admin/doctors/${doc.doctor_id}`)}
                                                    >
                                                        View
                                                    </button>

                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
