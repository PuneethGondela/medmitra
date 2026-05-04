interface AdminStatsProps {
  stats: {
    totalWorkers: number;
    totalDoctors: number;
    trustedDoctors: number;
    totalRecords: number;
  };
}

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
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
  );
}
