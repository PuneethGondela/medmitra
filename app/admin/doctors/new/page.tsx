"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { ArrowLeft, CheckCircle, Stethoscope, Mail, Phone, FileBadge, Building2, User } from "lucide-react";

export default function CreateDoctorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        mobileNumber: "",
        medicalLicense: "",
        specialization: "",
        hospitalName: "",
        hospitalId: "HOSP_001", // Default for MVP
        loginUsername: "",
    });
    const [createdCreds, setCreatedCreds] = useState<any>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem("admin_token");

        try {
            const res = await fetch("http://localhost:4000/api/doctors", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create");

            setCreatedCreds({ ...formData, tempPassword: data.tempPassword });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (createdCreds) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center animate-in fade-in duration-500">
                <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border-2 border-primary-100">
                    <div className="mx-auto flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600 animate-in zoom-in duration-300" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3 text-slate-900">Doctor Created!</h2>
                    <p className="text-slate-600 mb-8 text-lg">Account has been successfully set up.</p>

                    <div className="bg-slate-50 p-6 rounded-xl text-left space-y-4 mb-8 font-mono text-sm border border-slate-200 shadow-inner">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Username</p>
                            <p className="text-lg font-bold text-slate-900 bg-white p-2 rounded border border-slate-200">{createdCreds.loginUsername}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Temporary Password</p>
                            <p className="text-lg font-bold text-slate-900 bg-white p-2 rounded border border-slate-200">{createdCreds.tempPassword}</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push("/admin/doctors")}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 text-lg rounded-xl shadow-md transition-all"
                    >
                        Back to Doctor List
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-8 hover:bg-slate-200 text-slate-600 -ml-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to List
                </Button>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    <div className="gradient-hero p-8 text-white">
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Stethoscope className="w-8 h-8 opacity-80" />
                            Add New Doctor
                        </h1>
                        <p className="text-primary-100 mt-2">Enter the details below to create a new doctor account.</p>
                    </div>

                    <div className="p-8 md:p-10">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            required
                                            value={formData.fullName}
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="Dr. John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="john.doe@hospital.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Mobile Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            value={formData.mobileNumber}
                                            onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Medical License</label>
                                    <div className="relative">
                                        <FileBadge className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            required
                                            value={formData.medicalLicense}
                                            onChange={e => setFormData({ ...formData, medicalLicense: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="REG-2024-XXXX"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Specialization</label>
                                    <div className="relative">
                                        <Stethoscope className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            required
                                            value={formData.specialization}
                                            onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="Cardiology"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Hospital/Clinic Name</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            required
                                            value={formData.hospitalName}
                                            onChange={e => setFormData({ ...formData, hospitalName: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="City General Hospital"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4 md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Login Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            required
                                            value={formData.loginUsername}
                                            onChange={e => setFormData({ ...formData, loginUsername: e.target.value })}
                                            className="pl-10 py-6 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            placeholder="dr_john_doe"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium ml-1">This will be used for logging in. A temporary password will be generated.</p>
                                </div>
                            </div>

                            <div className="pt-8 flex justify-end gap-4 border-t border-slate-100 mt-8">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-8 py-6 text-lg font-bold border-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-6 text-lg font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 hover:shadow-xl transition-all"
                                >
                                    {loading ? "Creating Account..." : "Create Doctor Account"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
