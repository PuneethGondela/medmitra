import DoctorAuthGuard from "@/components/DoctorAuthGuard";

export default function DoctorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DoctorAuthGuard>
            <div className="doctor-layout min-h-screen bg-slate-50">
                {children}
            </div>
        </DoctorAuthGuard>
    );
}
