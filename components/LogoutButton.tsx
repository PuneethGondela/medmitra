// components/LogoutButton.tsx
"use client";
import React, { useState } from "react";
import { signOutUser } from "../lib/firebase-auth-helpers";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      localStorage.removeItem("doctor_token");
      localStorage.removeItem("doctor_user");
      await signOutUser();
      router.push("/login");
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="sm"
      disabled={loading}
      className="border-danger-300 text-danger-700 hover:bg-danger-50 hover:text-danger-800"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {loading ? "Signing out..." : "Logout"}
    </Button>
  );
}
