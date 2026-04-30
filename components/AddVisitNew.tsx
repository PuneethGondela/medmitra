// components/AddVisitNew.tsx - MIGRATED TO FIREBASE
"use client";
import React, { useState } from "react";
import { getCurrentUser, insertDocument, uploadFile } from "../lib/firebase-helpers";
import FormInput from "./FormInput";
import Button from "./Button";
import { extractEntities } from "../lib/ml-client";
import { Sparkles, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import VoiceInput from "./VoiceInput";

export default function AddVisitNew({
  prefill,
  onCreated,
}: {
  prefill?: any;
  onCreated: (worker: any, rec: any) => void;
}) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState(""); // New Field
  const [gender, setGender] = useState(""); // New Field
  const [bloodGroup, setBloodGroup] = useState("");
  const [language, setLanguage] = useState("hi-IN"); // Default Mother Tongue
  const [donorConsent, setDonorConsent] = useState(false); // New Field
  const [consentObtained, setConsentObtained] = useState(false);
  const [diagnosisRaw, setDiagnosisRaw] = useState("");
  const [diagnosisSimple, setDiagnosisSimple] = useState("");
  const [prescription, setPrescription] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    workerId: string;
  } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [entities, setEntities] = useState<any>(null);

  async function handleExtractEntities() {
    if (!prescription.trim()) return;

    setExtracting(true);
    setMessage(null);
    setEntities(null);
    try {
      setMessage("🔄 Extracting entities... This may take 5-10 seconds on first use.");
      const result = await extractEntities(prescription);
      setEntities(result.entities);
      // Safety check for null/undefined entities (which backend might return on empty/error)
      if (result.entities && typeof result.entities === 'object' && Object.values(result.entities).some((arr: any) => Array.isArray(arr) && arr.length > 0)) {
        setMessage("✅ Entities extracted successfully!");
      } else {
        setMessage("ℹ️ No entities found. You can continue manually.");
        setEntities(result.entities || {
          medicines: [],
          dosages: [],
          frequencies: [],
          conditions: [],
          durations: [],
          warnings: [],
        });
      }
    } catch (error: any) {
      console.error("Entity extraction failed:", error);
      setMessage(error.message || "Failed to extract entities. Please continue without it.");
      setEntities(null);
    } finally {
      setExtracting(false);
    }
  }

  // Helper to compress image
  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024; // Resize to max 1024px width
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas to Blob failed"));
          }, "image/jpeg", 0.7); // Compress to 70% quality JPEG
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // Calculate age from DOB if age is empty but DOB provided
    let calculatedAge = age;
    if (!age && dob) {
      const birthDate = new Date(dob);
      const diff = Date.now() - birthDate.getTime();
      const ageDate = new Date(diff);
      calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
    }

    if (!name || !email || !password || !diagnosisRaw || !consentObtained) {
      setMessage("Name, email, password, diagnosis, and consent are required");
      return;
    }

    setLoading(true);

    try {
      // Get current user token
      const user = await getCurrentUser();
      if (!user) {
        setMessage("Not authenticated");
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();

      // 1. Create Worker Account
      setMessage("⏳ Creating worker account... (Step 1/3)");
      const response = await fetch("/api/doctor/create-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          name,
          phone: phone || null,
          address: address || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
          age: calculatedAge,
          dob, // New Field
          bloodGroup,
          gender, // New Field
          language, // New Field: Mother Tongue
          donorConsent, // New Field
          consentObtained,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create worker");
      }

      const worker = data.worker;

      // 2. Save Visit Record
      setMessage("⏳ Saving visit details... (Step 2/3)");
      const doctorId = user.uid;
      if (!doctorId) throw new Error("Not authenticated");

      const recordData = {
        worker_id: worker.id,
        doctor_id: doctorId,
        diagnosis_raw: diagnosisRaw,
        diagnosis_simple: diagnosisSimple || diagnosisRaw,
        prescription_note: prescription,
        voice_note: voiceNote,
        severity,
        visit_date: Timestamp.now(),
      };

      const recordId = await insertDocument("records", recordData);
      const rec = { id: recordId, ...recordData };

      // 3. Upload file if provided
      if (file) {
        setMessage("⏳ Compressing and uploading scan... (Step 3/3)");
        let fileToUpload: File | Blob = file;

        // Compress if image
        if (file.type.startsWith("image/")) {
          try {
            fileToUpload = await compressImage(file);
            console.log(`Compressed image size: ${fileToUpload.size} bytes`);
          } catch (err) {
            console.warn("Compression failed, uploading original", err);
          }
        }

        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `${worker.id}/${fileName}`;

        // Use the compressed blob
        const fileUrl = await uploadFile("health-files", filePath, fileToUpload);

        await insertDocument("attachments", {
          record_id: recordId,
          file_path: filePath,
          file_url: fileUrl,
          file_type: "xray",
          description: diagnosisSimple || "Attachment",
        });
      }

      // Store credentials to show to doctor
      setCreatedCredentials({
        email: email,
        password: password,
        workerId: worker.id,
      });

      setMessage("✅ Data added successfully! Worker account and visit saved to database.");
      onCreated(worker, rec);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to create worker and visit");
    } finally {
      setLoading(false);
    }
  }

  // Show credentials if worker was just created
  if (createdCredentials) {
    return (
      <div className="card">
        <div className="bg-accent-50 border-2 border-accent-300 rounded-lg p-6 mb-4">
          <h3 className="text-lg font-semibold text-accent-900 mb-4">
            ✅ Worker Created Successfully!
          </h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded border border-accent-200">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Worker Login Credentials (Share with worker):
              </div>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-semibold text-primary-700">{createdCredentials.email}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.email);
                      alert("Email copied!");
                    }}
                    className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Password:</span>
                  <span className="font-semibold text-primary-700">{createdCredentials.password}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.password);
                      alert("Password copied!");
                    }}
                    className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-warning-50 border border-warning-200 rounded p-3 text-sm text-warning-800">
              <strong>Important:</strong> Please inform the worker to log in with these credentials.
              They can update their profile after logging in.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setCreatedCredentials(null);
              // Reset all fields
              setName("");
              setEmail("");
              setPhone("");
              setPassword("");
              setAddress("");
              setEmergencyContact("");
              setEmergencyPhone("");
              setAge("");
              setDob("");
              setGender("");
              setBloodGroup("");
              setDonorConsent(false);
              setConsentObtained(false);
              setDiagnosisRaw("");
              setDiagnosisSimple("");
              setPrescription("");
              setVoiceNote("");
              setFile(null);
              setSeverity("low");
              setLanguage("hi-IN");
              setMessage(null);
            }}
            variant="secondary"
          >
            Create Another Worker
          </Button>
          <Button
            onClick={() => {
              setCreatedCredentials(null);
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8">
      <h3 className="text-xl md:text-2xl font-bold mb-6 text-slate-900 flex items-center gap-2">
        <span className="text-2xl">👤</span>
        Create Worker & Add Visit
      </h3>

      {message && (
        <div
          className={`mb-6 p-4 md:p-5 rounded-xl text-base font-semibold shadow-medium border-2 ${message.includes("success")
            ? "bg-green-50 text-green-800 border-green-300"
            : "bg-red-50 text-red-800 border-red-300"
            }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{message.includes("success") ? "✅" : "❌"}</span>
            <span>{message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Name *"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Worker's full name"
            required
          />

          <FormInput
            label="Phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            type="tel"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">DOB</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200"
            />
          </div>
          <FormInput
            label="Age"
            name="age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Age (calc if DOB set)"
            type="number"
          />
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
            >
              <option value="">Select Blood Group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Mother Tongue (Language) *</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
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
            checked={donorConsent}
            onChange={(e) => setDonorConsent(e.target.checked)}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="worker@example.com"
            type="email"
            required
          />

          <FormInput
            label="Password *"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            type="password"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Address
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Emergency contact name"
            />

            <FormInput
              label="Contact Phone"
              name="emergencyPhone"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Emergency contact number"
              type="tel"
            />
          </div>
        </div>

        <div className="border-t-2 border-zinc-200 pt-6">
          <h4 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <span>🏥</span>
            Visit Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput
              label="Diagnosis (Technical/Raw) *"
              name="diagnosisRaw"
              value={diagnosisRaw}
              onChange={(e) => setDiagnosisRaw(e.target.value)}
              placeholder="Enter diagnosis"
              required
            />

            <FormInput
              label="Diagnosis (Simple - for patient)"
              name="diagnosisSimple"
              value={diagnosisSimple}
              onChange={(e) => setDiagnosisSimple(e.target.value)}
              placeholder="Simple explanation"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900">
                Prescription (medicines) *
              </label>
              <div className="flex gap-2">
                <VoiceInput
                  onTranscript={(text) => {
                    // Append to current text
                    setPrescription(prev => prev ? prev + " " + text : text);
                  }}
                  className="inline-block"
                />
                <button
                  type="button"
                  onClick={handleExtractEntities}
                  disabled={extracting || !prescription.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-primary-800 text-white rounded-lg hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract Entities
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              value={prescription}
              onChange={(e) => {
                setPrescription(e.target.value);
                setEntities(null);
              }}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
              rows={4}
              placeholder="Enter prescription details, medicines, dosages, etc... (Or use Voice Input)"
            />
            {entities && (
              <div className="mt-3 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-300 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-bold text-slate-900">AI Extracted Entities:</div>
                </div>
                {Object.values(entities).some((arr: any) => arr.length > 0) ? (
                  <div className="space-y-2 text-sm text-slate-800">
                    {entities.medicines.length > 0 && (
                      <div className="p-2 bg-white rounded border border-primary-200">
                        <strong className="text-primary-800">💊 Medicines:</strong>{" "}
                        <span className="text-slate-900 font-semibold">{entities.medicines.join(", ")}</span>
                      </div>
                    )}
                    {entities.dosages.length > 0 && (
                      <div className="p-2 bg-white rounded border border-primary-200">
                        <strong className="text-primary-800">📊 Dosages:</strong>{" "}
                        <span className="text-slate-900 font-semibold">{entities.dosages.join(", ")}</span>
                      </div>
                    )}
                    {entities.frequencies.length > 0 && (
                      <div className="p-2 bg-white rounded border border-primary-200">
                        <strong className="text-primary-800">⏰ Frequencies:</strong>{" "}
                        <span className="text-slate-900 font-semibold">{entities.frequencies.join(", ")}</span>
                      </div>
                    )}
                    {entities.durations.length > 0 && (
                      <div className="p-2 bg-white rounded border border-primary-200">
                        <strong className="text-primary-800">📅 Durations:</strong>{" "}
                        <span className="text-slate-900 font-semibold">{entities.durations.join(", ")}</span>
                      </div>
                    )}
                    {entities.warnings.length > 0 && (
                      <div className="p-2 bg-amber-50 rounded border-2 border-amber-300">
                        <strong className="text-amber-900">⚠️ Warnings:</strong>{" "}
                        <span className="text-amber-800 font-semibold">{entities.warnings.join(", ")}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded border border-primary-200 text-slate-600 text-sm">
                    ℹ️ No entities could be extracted from this text. Please continue manually.
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Voice Note (what will be spoken) *
              </label>
              <VoiceInput
                onTranscript={(text) => {
                  setVoiceNote(prev => prev ? prev + " " + text : text);
                }}
              />
            </div>
            <textarea
              value={voiceNote}
              onChange={(e) => setVoiceNote(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 resize-y"
              rows={4}
              placeholder="Enter text that will be read aloud to worker in their selected language"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Attachment (X-ray / report)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="checkbox"
            id="consent"
            checked={consentObtained}
            onChange={(e) => setConsentObtained(e.target.checked)}
            className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
          />
          <label htmlFor="consent" className="text-sm text-slate-700 cursor-pointer select-none">
            I certify that I have obtained explicit consent from the user/patient for collecting their personal and medical data, and for their treatment.
          </label>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create Worker & Save Visit"}
        </Button>
      </form>
    </div>
  );
}
