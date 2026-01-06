"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

export default function AdminDashboard() {
    const router = useRouter();
    const [admin, setAdmin] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token) {
            router.push("/admin/login");
            return;
        }
        const userStr = localStorage.getItem("admin_user");
        if (userStr) setAdmin(JSON.parse(userStr));

        fetchStats(token);
    }, [router]);

    const fetchStats = async (token: string) => {
        try {
            const res = await fetch('http://localhost:4000/api/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Stats fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        router.push("/admin/login");
    };

    if (!admin || loading) return <div className="p-8">Loading Dashboard...</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const pieData = stats ? [
        { name: 'Doctors', value: stats.counts.doctors },
        { name: 'Workers', value: stats.counts.workers },
    ] : [];

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-blue-900">Med Mitra Admin</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, {admin.email}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </nav>

            <main className="p-6 max-w-7xl mx-auto space-y-6">

                {/* 1. Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition" onClick={() => router.push('/admin/doctors')}>
                        <h3 className="text-gray-500 text-sm font-medium">Total Doctors</h3>
                        <p className="text-3xl font-bold mt-2">{stats?.counts?.doctors || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition" onClick={() => router.push('/admin/workers')}>
                        <h3 className="text-gray-500 text-sm font-medium">Active Workers</h3>
                        <p className="text-3xl font-bold mt-2">{stats?.counts?.workers || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition" onClick={() => router.push('/admin/donors')}>
                        <h3 className="text-gray-500 text-sm font-medium">Blood Donors</h3>
                        <p className="text-3xl font-bold mt-2 text-red-600">{stats?.counts?.donors || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-gray-500 text-sm font-medium">Today&apos;s Visits</h3>
                        <p className="text-3xl font-bold mt-2 text-blue-600">{stats?.counts?.visits || 0}</p>
                    </div>
                </div>

                {/* 2. Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Growth Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border lg:col-span-2">
                        <h3 className="font-bold text-gray-800 mb-4">Registration Growth</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.chartData || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="doctors" fill="#3b82f6" name="Doctors" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="workers" fill="#10b981" name="Workers" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Monitor Card (Replaced Pie Chart for better utility here, or keep both) */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition relative overflow-hidden" onClick={() => router.push('/admin/bot')}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">🤖</div>
                            <h3 className="text-gray-500 text-sm font-medium relative z-10">Mitr AI Monitor</h3>
                            <p className="text-2xl font-bold mt-2 text-purple-600 relative z-10">Active</p>
                            <p className="text-xs text-gray-400 mt-1 relative z-10">Click to ask about security...</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="font-bold text-gray-800 mb-4">Resources</h3>
                            <div className="h-40 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%" cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Doctors</div>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Workers</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Recent Activity (Audit Log placeholder/concept) */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-800">System Status</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm font-medium text-gray-700">All Systems Operational</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Backend (v1.0), ML Server (v2.1 - Qwen 1.5B), Database (PostgreSQL).
                        </p>
                    </div>
                </div>

            </main>
        </div>
    );
}
