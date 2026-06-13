"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PRODUCT_ROLES = [
  "Product Analyst",
  "Senior Product Analyst",
  "APM",
  "PM",
  "Senior PM",
  "Growth PM",
  "Lead PM",
];

interface AnalysisResult {
  ats_score: number;
  sub_scores: {
    keyword_coverage: number;
    formatting_safety: number;
    section_completeness: number;
    contact_info: number;
    date_consistency: number;
  };
  keyword_analysis: {
    total_keywords: number;
    found_count: number;
    missing_count: number;
    found: string[];
    missing: { keyword: string; priority: "high" | "medium" | "low" }[];
  };
  bullet_feedback: {
    original: string;
    issue: string;
    improved: string;
    reason: string;
  }[];
  section_feedback: {
    missing_sections: string[];
    thin_sections: string[];
    recommendations: string[];
  };
  grammar_issues: { text: string; fix: string }[];
  summary_rewrite: string;
  tone_check: {
    current_level: string;
    target_level: string;
    is_aligned: boolean;
    comment: string;
  };
  top_improvements: {
    priority: number;
    section: string;
    action: string;
    impact: string;
  }[];
  role_fit_score: number | null;
  role_fit_summary: string | null;
  role_fit_quick_wins: string[];
  mode: string;
  target_roles: string[];
  }

interface Props {
  userId: string;
  hasResume: boolean;
  savedAnalysis?: AnalysisResult | null;
}

export default function ResumeAnalyser({ userId, hasResume, savedAnalysis }: Props) {
  const [mode, setMode] = useState<"general" | "jd_specific">("general");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(savedAnalysis || null);
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "bullets" | "improvements">("overview");

  function toggleRole(role: string) {
    setSelectedRoles(prev => {
      if (prev.includes(role)) return prev.filter(r => r !== role);
      if (prev.length >= 3) return prev;
      return [...prev, role];
    });
  }

  async function runAnalysis() {
    if (mode === "general" && selectedRoles.length === 0) {
      setError("Please select at least one target role.");
      return;
    }
    if (mode === "jd_specific" && !jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Session expired. Please sign in again.");
        return;
      }

      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          targetRoles: selectedRoles,
          jobDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed. Please try again.");
        return;
      }

      setResult(data.analysis);
      setActiveTab("overview");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  }

  function getScoreBg(score: number) {
    if (score >= 75) return "bg-green-50 border-green-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  }

  function getPriorityColor(priority: string) {
    if (priority === "high") return "bg-red-100 text-red-700";
    if (priority === "medium") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  }

  if (!hasResume) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mt-6">
        <p className="text-gray-500 text-sm text-center">
          Upload your resume above to run an ATS analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mt-6">
      <h2 className="text-2xl font-display text-[#0F4C81] mb-2">
        ATS Analyser
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Analyse your resume against ATS best practices.
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("general")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "general"
              ? "bg-[#0F4C81] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          General Optimisation
        </button>
        <button
          onClick={() => setMode("jd_specific")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "jd_specific"
              ? "bg-[#0F4C81] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tailor to Job Description
        </button>
      </div>

      {/* Mode A - Role Selection */}
      {mode === "general" && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">
            Select up to 3 target roles
            <span className="text-gray-400 ml-1">({selectedRoles.length}/3 selected)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_ROLES.map(role => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  selectedRoles.includes(role)
                    ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#0F4C81]"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode B - JD Input */}
      {mode === "jd_specific" && (
        <div className="mb-6">
          <label className="text-sm text-gray-600 mb-2 block">
            Paste the job description
          </label>
          <textarea
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#0F4C81] resize-none"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <button
        onClick={runAnalysis}
        disabled={loading}
        className="bg-[#0F4C81] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0a3560] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analysing...
          </>
        ) : (
          "Analyse Resume"
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8">
          {/* Score Cards */}
          <div className={`rounded-xl border p-6 mb-6 ${getScoreBg(result.ats_score)}`}>
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-gray-500 mb-1">ATS Score</p>
                  <p className={`text-5xl font-display font-bold ${getScoreColor(result.ats_score)}`}>
                    {result.ats_score}
                    <span className="text-2xl text-gray-400">/100</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Based on ATS best practices</p>
                </div>
                {result.mode === "jd_specific" && result.role_fit_score !== null && (
                  <div className="border-l border-gray-200 pl-8">
                    <p className="text-sm text-gray-500 mb-1">Role Fit Score</p>
                    <p className={`text-5xl font-display font-bold ${getScoreColor(result.role_fit_score)}`}>
                      {result.role_fit_score}
                      <span className="text-2xl text-gray-400">/100</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {result.role_fit_score >= 85 ? "Strong Match" :
                       result.role_fit_score >= 65 ? "Good Match" :
                       result.role_fit_score >= 40 ? "Average Match" : "Poor Match"}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 text-right">
                {Object.entries(result.sub_scores).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className={`text-sm font-medium ${getScoreColor(value as number)}`}>{value as number}/100</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Role Fit Summary — Mode B only */}
          {result.mode === "jd_specific" && result.role_fit_summary && (
            <div className="bg-[#EEF4FB] rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-[#0F4C81] mb-1">Role Fit Summary</p>
              <p className="text-sm text-gray-600">{result.role_fit_summary}</p>
              {result.role_fit_quick_wins?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Quick Wins</p>
                  <ul className="space-y-1">
                    {result.role_fit_quick_wins.map((win, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-[#F5A623]">→</span>
                        {win}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-100">
            {(["overview", "keywords", "bullets", "improvements"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-[#0F4C81] text-[#0F4C81]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {result.tone_check && (
                <div className="bg-[#EEF4FB] rounded-xl p-4">
                  <p className="text-sm font-medium text-[#0F4C81] mb-1">Seniority Check</p>
                  <p className="text-sm text-gray-600">{result.tone_check.comment}</p>
                  <p className={`text-xs mt-1 font-medium ${result.tone_check.is_aligned ? "text-green-600" : "text-amber-500"}`}>
                    {result.tone_check.is_aligned ? "✓ Well aligned" : "⚠ Misaligned seniority"}
                  </p>
                </div>
              )}

              {result.section_feedback?.missing_sections?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-red-700 mb-2">Missing Sections</p>
                  <div className="flex flex-wrap gap-2">
                    {result.section_feedback.missing_sections.map((s, i) => (
                      <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.section_feedback?.recommendations?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Recommendations</p>
                  <ul className="space-y-2">
                    {result.section_feedback.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-[#F5A623] mt-0.5">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.summary_rewrite && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Suggested Summary Rewrite</p>
                  <p className="text-sm text-gray-600 italic">{result.summary_rewrite}</p>
                </div>
              )}
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === "keywords" && (
            <div>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-green-600 font-medium">✓ {result.keyword_analysis.found_count} found</span>
                <span className="text-red-500 font-medium">✗ {result.keyword_analysis.missing_count} missing</span>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Missing Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.keyword_analysis.missing.map((item, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(item.priority)}`}
                    >
                      {item.keyword}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-1">red = high priority</span>
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mr-1">amber = medium</span>
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">grey = low</span>
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Keywords Found</p>
                <div className="flex flex-wrap gap-2">
                  {result.keyword_analysis.found.map((keyword, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bullets Tab */}
          {activeTab === "bullets" && (
            <div className="space-y-6">
              {result.bullet_feedback.length === 0 ? (
                <p className="text-sm text-gray-500">No weak bullets identified.</p>
              ) : (
                result.bullet_feedback.map((item, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="mb-3">
                      <p className="text-xs text-red-500 font-medium mb-1">Original</p>
                      <p className="text-sm text-gray-600">{item.original}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-amber-500 font-medium mb-1">Issue</p>
                      <p className="text-sm text-gray-600">{item.issue}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-green-600 font-medium mb-1">Improved</p>
                      <p className="text-sm text-gray-700 font-medium">{item.improved}</p>
                    </div>
                    <p className="text-xs text-gray-400">{item.reason}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Improvements Tab */}
          {activeTab === "improvements" && (
            <div className="space-y-3">
              {result.top_improvements.map((item, i) => (
                <div key={i} className="flex gap-4 border border-gray-100 rounded-xl p-4">
                  <div className="w-7 h-7 rounded-full bg-[#0F4C81] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {item.priority}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5 capitalize">{item.section}</p>
                    <p className="text-sm font-medium text-gray-700">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
