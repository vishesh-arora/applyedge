"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Resume {
  id: string;
  file_name: string;
  created_at: string;
}

interface Props {
  userId: string;
  existingResume: Resume | null;
}

export default function ResumeUploader({ userId, existingResume }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentResume, setCurrentResume] = useState<Resume | null>(existingResume);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get session token client-side
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Session expired. Please sign in again.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }

      setSuccess(true);
      setCurrentResume(data.resume);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <h2 className="text-2xl font-display text-[#0F4C81] mb-2">
        Your Resume
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Upload your resume in PDF format. Max 5MB. A new upload replaces your existing resume.
      </p>

      {currentResume && (
        <div className="flex items-center gap-3 bg-[#EEF4FB] rounded-lg px-4 py-3 mb-6">
          <svg className="w-5 h-5 text-[#0F4C81]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 2 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#0F4C81]">{currentResume.file_name}</p>
            <p className="text-xs text-gray-400">
              Uploaded {new Date(currentResume.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </p>
          </div>
        </div>
      )}

      <label className={`
        flex flex-col items-center justify-center w-full h-40 
        border-2 border-dashed rounded-xl cursor-pointer transition-colors
        ${uploading ? "border-gray-200 bg-gray-50 cursor-not-allowed" : "border-[#0F4C81] border-opacity-30 hover:border-opacity-60 hover:bg-[#EEF4FB]"}
      `}>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#0F4C81] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-[#0F4C81] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm text-gray-500">
              {currentResume ? "Upload a new resume to replace" : "Click to upload your resume"}
            </p>
            <p className="text-xs text-gray-400">PDF only, max 5MB</p>
          </div>
        )}
      </label>

      {error && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}

      {success && (
        <p className="mt-4 text-sm text-green-600">
          Resume uploaded successfully.
        </p>
      )}
    </div>
  );
}
