// app/admin/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import LogoutButton from "../../components/LogoutButton";
import { jwtDecode } from "jwt-decode";
import MedMitraChat from "../../components/MedMitraChat";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Doctor creation form
  const [doctorForm, setDoctorForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    trusted: false,
  });
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [doctorMessage, setDoctorMessage] = useState<string | null>(null);

  // Worker assignment
  const [workers, setWorkers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalWorkers: 0,
    totalDoctors: 0,
    totalRecords: 0,
    trustedDoctors: 0,
  });

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);



  const checkAdmin = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        router.push("/login");
        return;
      }

      // 1. Validate Token format
      const decoded: any = jwtDecode(token);

      if (!decoded || !decoded.role || decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("admin_token");
        router.push("/login");
        return;
      }

      // 2. (Optional) Verify with Backend API to ensure token isn't revoked
      // For now, we trust the token existence and expiration for initial load
      // Real protected data fetching will fail if token is invalid anyway

      setUser({ email: decoded.email || "Admin User", role: decoded.role });
      setRole("admin"); // UI expects "admin" string
    } catch (err) {
      console.error(err);
      localStorage.removeItem("admin_token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadWorkers = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:4000/api/workers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadDoctors = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:4000/api/doctors", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Map backend format to frontend expectation if needed
        const mapped = data.map((d: any) => ({
          id: d.doctor_id,
          name: d.full_name,
          email: d.email,
          trusted: d.account_status === 'ACTIVE' // Simplified trusted check for now
        }));
        setDoctors(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadStats = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:4000/api/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalWorkers: data.counts.workers,
          totalDoctors: data.counts.doctors,
          totalRecords: 0, // Not yet in backend stats
          trustedDoctors: data.counts.doctors, // Simplified
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAuditLogs = React.useCallback(async () => {
    setLoadingAudit(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:4000/api/audit", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        console.warn("Failed to fetch audit logs");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  const toggleDoctorTrusted = async (doctorId: string, currentTrusted: boolean) => {
    // Temporarily disabled until permissions endpoint is ready
    alert("Updating doctor status via new backend is coming next!");
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDoctor(true);
    setDoctorMessage(null);

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setDoctorMessage("Not authenticated");
        setCreatingDoctor(false);
        return;
      }

      const response = await fetch("http://localhost:4000/api/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: doctorForm.name,
          email: doctorForm.email,
          medicalLicense: "LIC-" + Date.now(), // Auto-gen for demo
          username: doctorForm.email.split('@')[0],
          hospitalName: "General Hospital",
          hospitalId: "HOSP-001",
          loginUsername: doctorForm.email.split('@')[0],
          specialization: "General"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create doctor");
      }

      setDoctorMessage("✅ Doctor created successfully!");
      setDoctorForm({ email: "", password: "", name: "", phone: "", trusted: false });
      loadDoctors();
    } catch (err: any) {
      console.log(err)
      setDoctorMessage(err.message || "Failed to create doctor");
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleAssignDoctor = async () => {
    alert("Assignment logic moving to backend...");
  };

  // Initial Load
  useEffect(() => {
    checkAdmin().then(() => {
      loadWorkers();
      loadDoctors();
      loadStats();
      loadAuditLogs();
    });
  }, [checkAdmin, loadWorkers, loadDoctors, loadStats, loadAuditLogs]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Premium Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-6 md:p-8 rounded-xl bg-primary-600 text-white shadow-lg border-2 border-primary-700">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-white/90 font-medium">Manage doctors, workers, and assignments</p>
        </div>
        <div className="flex gap-3">
          <Link href="/worker" className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-0">
            View Worker View
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Premium Stats Overview */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
          <div className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-2">Total Workers</div>
          <div className="text-3xl md:text-4xl font-bold text-primary-800">{stats.totalWorkers}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
          <div className="text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">Total Doctors</div>
          <div className="text-3xl md:text-4xl font-bold text-secondary-600">{stats.totalDoctors}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
          <div className="text-xs font-bold text-accent-700 uppercase tracking-wider mb-2">Trusted Doctors</div>
          <div className="text-3xl md:text-4xl font-bold text-accent-600">{stats.trustedDoctors}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
          <div className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-2">Total Records</div>
          <div className="text-3xl md:text-4xl font-bold text-primary-800">{stats.totalRecords}</div>
        </div>
      </section>

      {/* Create Doctor Section - Premium */}
      <section className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8 mb-8">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-slate-900 flex items-center gap-2">
          <span className="text-2xl">👨‍⚕️</span>
          Create Doctor
        </h2>
        {doctorMessage && (
          <div
            className={`mb-6 p-4 md:p-5 rounded-xl text-base font-semibold shadow-medium border-2 ${doctorMessage.includes("success")
              ? "bg-green-50 text-green-800 border-green-300"
              : "bg-red-50 text-red-800 border-red-300"
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{doctorMessage.includes("success") ? "✅" : "❌"}</span>
              <span>{doctorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateDoctor} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput
              label="Email *"
              name="email"
              value={doctorForm.email}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, email: e.target.value })
              }
              type="email"
              required
            />
            <FormInput
              label="Password *"
              name="password"
              value={doctorForm.password}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, password: e.target.value })
              }
              type="password"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput
              label="Name *"
              name="name"
              value={doctorForm.name}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, name: e.target.value })
              }
              required
            />
            <FormInput
              label="Phone"
              name="phone"
              value={doctorForm.phone}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, phone: e.target.value })
              }
              type="tel"
            />
          </div>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-300 hover:border-slate-500 transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={doctorForm.trusted}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, trusted: e.target.checked })
              }
              className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 border-2 border-zinc-300"
            />
            <span className="text-base font-bold text-slate-900">Mark as trusted doctor</span>
          </label>

          <Button type="submit" disabled={creatingDoctor}>
            {creatingDoctor ? "Creating..." : "Create Doctor"}
          </Button>
        </form>
      </section>

      {/* Assign Doctor Section - Premium */}
      <section className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8 mb-8">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-slate-900 flex items-center gap-2">
          <span className="text-2xl">🔗</span>
          Assign Doctor to Worker
        </h2>
        {assignMessage && (
          <div
            className={`mb-6 p-4 md:p-5 rounded-xl text-base font-semibold shadow-medium border-2 ${assignMessage.includes("success")
              ? "bg-green-50 text-green-800 border-green-300"
              : "bg-red-50 text-red-800 border-red-300"
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{assignMessage.includes("success") ? "✅" : "❌"}</span>
              <span>{assignMessage}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-base font-bold text-slate-900 mb-2">
              Select Worker *
            </label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a worker...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-bold text-slate-900 mb-2">
              Select Trusted Doctor *
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a doctor...</option>
              {doctors
                .filter((d) => d.trusted)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.email}) ✓ Trusted
                  </option>
                ))}
            </select>
          </div>

          <Button onClick={handleAssignDoctor} disabled={assigning || !selectedWorker || !selectedDoctor}>
            {assigning ? "Assigning..." : "Assign Doctor"}
          </Button>
        </div>
      </section>

      {/* Doctors List - High Clarity Table */}
      <section className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            All Doctors ({doctors.length})
          </h2>
          <button
            onClick={() => {
              loadDoctors();
              loadStats();
            }}
            className="px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl border-2 border-primary-200 transition-all"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {doctors.length === 0 ? (
            <div className="text-center py-12 text-slate-600 font-semibold">No doctors found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{doctor.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-700 font-semibold">{doctor.email}</td>
                    <td className="py-4 px-6 text-xs font-mono text-slate-600 font-semibold">{doctor.id.slice(0, 8)}...</td>
                    <td className="py-4 px-6">
                      {doctor.trusted ? (
                        <span className="badge-success">Trusted</span>
                      ) : (
                        <span className="badge-warning">Not Trusted</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => toggleDoctorTrusted(doctor.id, doctor.trusted)}
                        className="px-4 py-2 text-sm font-bold bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-all border-2 border-slate-300"
                      >
                        {doctor.trusted ? "Remove Trust" : "Mark Trusted"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* All Users List */}
      <section className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">All Users</h2>
          <button
            onClick={() => {
              loadWorkers();
              loadDoctors();
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Refresh
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">Workers ({workers.length})</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {workers.length === 0 ? (
                  <p className="text-sm text-slate-600 font-medium p-4 text-center">No workers found</p>
                ) : (
                  workers.map((worker) => (
                    <div
                      key={worker.id}
                      className="p-4 border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <div className="font-bold text-slate-900 mb-1">{worker.name || "No name"}</div>
                      <div className="text-sm text-slate-600 font-medium">{worker.email}</div>
                      <div className="text-xs text-slate-500 mt-1">{worker.phone || "No phone"}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">Doctors ({doctors.length})</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {doctors.length === 0 ? (
                  <p className="text-sm text-slate-600 font-medium p-4 text-center">No doctors found</p>
                ) : (
                  doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="p-4 border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <div className="font-bold text-slate-900 mb-1">{doctor.name}</div>
                      <div className="text-sm text-slate-600 font-medium">{doctor.email}</div>
                      {doctor.trusted && (
                        <span className="inline-block mt-2 text-xs badge-success">Trusted</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audit Logs - Premium Table */}
      <section className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Recent Audit Logs ({auditLogs.length})
          </h2>
          <button
            onClick={loadAuditLogs}
            className="px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl border-2 border-primary-200 transition-all disabled:opacity-50"
            disabled={loadingAudit}
          >
            {loadingAudit ? "Loading..." : "🔄 Refresh"}
          </button>
        </div>
        {loadingAudit ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3"></div>
            <div className="text-slate-700 font-semibold">Loading audit logs...</div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-600 font-semibold">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Action</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Actor</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Resource</th>
                  <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900">{log.action}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-700 font-semibold">
                      {log.actor?.name || log.actor?.email || "Unknown"}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-700 font-semibold">
                      {log.resource_type} <span className="text-xs font-mono text-slate-500 font-semibold">({log.resource_id?.slice(0, 8) || "N/A"})</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600 font-semibold">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {/* Chat Bot */}
      <MedMitraChat />
    </div>
  );
}

