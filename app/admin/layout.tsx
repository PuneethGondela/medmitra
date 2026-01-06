import AdminAuthGuard from "@/components/AdminAuthGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminAuthGuard>
            <div className="admin-layout">
                {children}
            </div>
        </AdminAuthGuard>
    );
}
