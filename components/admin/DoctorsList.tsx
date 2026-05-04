import React from 'react';

interface DoctorsListProps {
  doctors: any[];
  loadDoctors: () => Promise<void>;
  loadStats: () => Promise<void>;
  toggleDoctorTrusted: (doctorId: string, currentTrusted: boolean) => Promise<void>;
}

export default function DoctorsList({
  doctors,
  loadDoctors,
  loadStats,
  toggleDoctorTrusted
}: DoctorsListProps) {
  return (
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
  );
}
