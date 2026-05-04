import React from 'react';
import FormInput from "../FormInput";
import Button from "../Button";

interface CreateDoctorFormProps {
  doctorForm: {
    email: string;
    password?: string;
    name: string;
    phone: string;
    trusted: boolean;
  };
  setDoctorForm: (form: any) => void;
  handleCreateDoctor: (e: React.FormEvent) => Promise<void>;
  creatingDoctor: boolean;
  doctorMessage: string | null;
}

export default function CreateDoctorForm({
  doctorForm,
  setDoctorForm,
  handleCreateDoctor,
  creatingDoctor,
  doctorMessage
}: CreateDoctorFormProps) {
  return (
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
            value={doctorForm.password || ""}
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
  );
}
