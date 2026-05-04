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
import AdminStats from "../../components/admin/AdminStats";
import CreateDoctorForm from "../../components/admin/CreateDoctorForm";
import AssignDoctorForm from "../../components/admin/AssignDoctorForm";
import DoctorsList from "../../components/admin/DoctorsList";
import UsersList from "../../components/admin/UsersList";
import AuditLogsTable from "../../components/admin/AuditLogsTable";

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
      <AdminStats stats={stats} />

      {/* Create Doctor Section - Premium */}
      <CreateDoctorForm
        doctorForm={doctorForm}
        setDoctorForm={setDoctorForm}
        handleCreateDoctor={handleCreateDoctor}
        creatingDoctor={creatingDoctor}
        doctorMessage={doctorMessage}
      />

      {/* Assign Doctor Section - Premium */}
      <AssignDoctorForm
        workers={workers}
        doctors={doctors}
        selectedWorker={selectedWorker}
        setSelectedWorker={setSelectedWorker}
        selectedDoctor={selectedDoctor}
        setSelectedDoctor={setSelectedDoctor}
        handleAssignDoctor={handleAssignDoctor}
        assigning={assigning}
        assignMessage={assignMessage}
      />

      {/* Doctors List - High Clarity Table */}
      <DoctorsList
        doctors={doctors}
        loadDoctors={loadDoctors}
        loadStats={loadStats}
        toggleDoctorTrusted={toggleDoctorTrusted}
      />

      {/* All Users List */}
      <UsersList
        workers={workers}
        doctors={doctors}
        loadWorkers={loadWorkers}
        loadDoctors={loadDoctors}
      />

      {/* Audit Logs - Premium Table */}
      <AuditLogsTable
        auditLogs={auditLogs}
        loadingAudit={loadingAudit}
        loadAuditLogs={loadAuditLogs}
      />
      {/* Chat Bot */}
      <MedMitraChat />
    </div>
  );
}

