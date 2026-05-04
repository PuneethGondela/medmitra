import React from "react";
import Button from "../Button";

interface CredentialsResultProps {
  credentials: {
    email: string;
    password: string;
  };
  onCreateAnother: () => void;
  onContinue: () => void;
}

export default function CredentialsResult({
  credentials,
  onCreateAnother,
  onContinue,
}: CredentialsResultProps) {
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
                <span className="font-semibold text-primary-700">{credentials.email}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.email);
                    alert("Email copied!");
                  }}
                  className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Password:</span>
                <span className="font-semibold text-primary-700">{credentials.password}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.password);
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
        <Button onClick={onCreateAnother} variant="secondary">
          Create Another Worker
        </Button>
        <Button onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
