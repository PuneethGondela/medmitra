import React from 'react';
import Button from "../Button";

interface AssignDoctorFormProps {
  workers: any[];
  doctors: any[];
  selectedWorker: string;
  setSelectedWorker: (id: string) => void;
  selectedDoctor: string;
  setSelectedDoctor: (id: string) => void;
  handleAssignDoctor: () => Promise<void>;
  assigning: boolean;
  assignMessage: string | null;
}

export default function AssignDoctorForm({
  workers,
  doctors,
  selectedWorker,
  setSelectedWorker,
  selectedDoctor,
  setSelectedDoctor,
  handleAssignDoctor,
  assigning,
  assignMessage
}: AssignDoctorFormProps) {
  return (
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
  );
}
