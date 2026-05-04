import React from 'react';

interface UsersListProps {
  workers: any[];
  doctors: any[];
  loadWorkers: () => Promise<void>;
  loadDoctors: () => Promise<void>;
}

export default function UsersList({
  workers,
  doctors,
  loadWorkers,
  loadDoctors
}: UsersListProps) {
  return (
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
  );
}
