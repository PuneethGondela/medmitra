import React from "react";
import FormInput from "../FormInput";

interface WorkerProfileFormProps {
  data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    age: string;
    dob: string;
    gender: string;
    bloodGroup: string;
    language: string;
    donorConsent: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export default function WorkerProfileForm({ data, onChange }: WorkerProfileFormProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name *"
          name="name"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Worker's full name"
          required
        />

        <FormInput
          label="Phone"
          name="phone"
          value={data.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="Phone number"
          type="tel"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">DOB</label>
          <input
            type="date"
            value={data.dob}
            onChange={(e) => onChange("dob", e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200"
          />
        </div>
        <FormInput
          label="Age"
          name="age"
          value={data.age}
          onChange={(e) => onChange("age", e.target.value)}
          placeholder="Age (calc if DOB set)"
          type="number"
        />
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Gender</label>
          <select
            value={data.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Blood Group</label>
          <select
            value={data.bloodGroup}
            onChange={(e) => onChange("bloodGroup", e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
          >
            <option value="">Select Blood Group</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Mother Tongue (Language) *
        </label>
        <select
          value={data.language}
          onChange={(e) => onChange("language", e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
        >
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi (हिंदी)</option>
          <option value="te-IN">Telugu (తెలుగు)</option>
          <option value="or-IN">Odia (ଓଡ଼ିଆ)</option>
        </select>
        <p className="text-xs text-slate-500 mt-1">
          This language will be used for the worker&apos;s dashboard and AI bot interactions.
        </p>
      </div>

      {/* Donor Consent */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <input
          type="checkbox"
          id="donorConsent"
          checked={data.donorConsent}
          onChange={(e) => onChange("donorConsent", e.target.checked)}
          className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
        />
        <label htmlFor="donorConsent" className="text-sm font-semibold text-red-900 cursor-pointer">
          Will you donate blood? (User Consent)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Email *"
          name="email"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="worker@example.com"
          type="email"
          required
        />

        <FormInput
          label="Password *"
          name="password"
          value={data.password}
          onChange={(e) => onChange("password", e.target.value)}
          placeholder="At least 6 characters"
          type="password"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">Address</label>
        <textarea
          value={data.address}
          onChange={(e) => onChange("address", e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
          rows={3}
          placeholder="Enter worker&apos;s address"
        />
      </div>

      <div className="border-t-2 border-zinc-200 pt-6">
        <h4 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span>📞</span>
          Emergency Contact
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormInput
            label="Contact Name"
            name="emergencyContact"
            value={data.emergencyContact}
            onChange={(e) => onChange("emergencyContact", e.target.value)}
            placeholder="Emergency contact name"
          />

          <FormInput
            label="Contact Phone"
            name="emergencyPhone"
            value={data.emergencyPhone}
            onChange={(e) => onChange("emergencyPhone", e.target.value)}
            placeholder="Emergency contact number"
            type="tel"
          />
        </div>
      </div>
    </>
  );
}
