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
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData(token: string) {
      // Fetch resume
      const resumeRes = await fetch("/api/get", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-store",
        },
      });
      if (resumeRes.ok) {
        const data = await resumeRes.json();
        setResume(data.resume || null);
      }

      // Fetch last analysis
      const analysisRes = await fetch("/api/analyse/last", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-store",
        },
      });
      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setLastAnalysis(data.analysis || null);
      }

      setLoading(false);
    }

    // Listen for auth state — fires when session is restored from storage
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token) {
          await fetchData(session.access_token);
        } else {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

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
        onResumeUpdate={(updatedResume) => setResume(updatedResume)}
      />
      <ResumeAnalyser
        userId={userId}
        hasResume={!!resume}
        savedAnalysis={lastAnalysis}
      />
    </>
  );
}
