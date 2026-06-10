"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ResumeUploader from "@/components/ResumeUploader";
import ResumeAnalyser from "@/components/ResumeAnalyser";

interface Resume {
  id: string;
  file_name: string;
  created_at: string;
}

interface Props {
  userId: string;
}

export default function DashboardClient({ userId }: Props) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResume() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/resume/get", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setResume(data.resume);
      }
      setLoading(false);
    }

    fetchResume();
  }, [userId]);

  function handleResumeUpdate(updatedResume: Resume) {
    setResume(updatedResume);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#0F4C81] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ResumeUploader
        userId={userId}
        existingResume={resume}
        onResumeUpdate={handleResumeUpdate}
      />
      <ResumeAnalyser userId={userId} hasResume={!!resume} />
    </>
  );
}
