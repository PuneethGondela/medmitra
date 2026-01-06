"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function DoctorAuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Public pages under /doctor (if any)
        if (pathname === "/doctor/login") {
            setAuthorized(true);
            return;
        }

        const token = localStorage.getItem("doctor_token");
        if (!token) {
            router.push("/login");
        } else {
            setAuthorized(true);
        }
    }, [router, pathname]);

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-primary-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    <p className="mt-4 text-slate-500 font-medium">Verifying Doctor Access...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
