import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { getKeywordsForRoles, findKeywordMatches } from "@/lib/keywords";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const { mode, targetRoles, jobDescription } = body;

    if (mode !== "general" && mode !== "jd_specific") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    if (mode === "general" && (!targetRoles || targetRoles.length === 0)) {
      return NextResponse.json({ error: "Target roles required for general mode" }, { status: 400 });
    }

    if (mode === "jd_specific" && !jobDescription) {
      return NextResponse.json({ error: "Job description required for JD mode" }, { status: 400 });
    }

    // Get resume
    const { data: resume } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!resume || !resume.extracted_text) {
      return NextResponse.json({ error: "No resume found. Please upload your resume first." }, { status: 400 });
    }

    const resumeText = resume.extracted_text;

    // Keyword analysis
    let keywords: string[] = [];
    if (mode === "general") {
      keywords = getKeywordsForRoles(targetRoles);
    } else {
      // Extract keywords from JD using Claude
      const jdKeywordResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Extract the most important keywords and skills from this job description. Return ONLY a JSON array of strings, no other text.

Job Description:
${jobDescription}

Return format: ["keyword1", "keyword2", ...]`
        }]
      });

      try {
        const jdText = jdKeywordResponse.content[0].type === "text"
          ? jdKeywordResponse.content[0].text
          : "";
        const cleaned = jdText.replace(/```json|```/g, "").trim();
        keywords = JSON.parse(cleaned);
      } catch {
        keywords = [];
      }
    }

    const { found, missing } = findKeywordMatches(resumeText, keywords);

    // ATS scoring
    const formattingIssues: string[] = [];
    const lowerText = resumeText.toLowerCase();

    if (resumeText.includes("\t")) formattingIssues.push("Contains tabs which may cause parsing issues");
    if (resumeText.split("\n").some((line: string) => line.length > 200)) formattingIssues.push("Some lines are very long");

    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
    const hasPhone = /(\+91|0)?[6-9]\d{9}/.test(resumeText) || /\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(resumeText);
    const hasLinkedIn = lowerText.includes("linkedin");

    const hasSummary = lowerText.includes("summary") || lowerText.includes("objective") || lowerText.includes("profile");
    const hasExperience = lowerText.includes("experience") || lowerText.includes("work history");
    const hasEducation = lowerText.includes("education") || lowerText.includes("degree") || lowerText.includes("university") || lowerText.includes("college");
    const hasSkills = lowerText.includes("skills") || lowerText.includes("technologies") || lowerText.includes("tools");

    const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{4}\b/i;
    const hasConsistentDates = datePattern.test(resumeText);

    // Sub-scores
    const keywordScore = keywords.length > 0
      ? Math.round((found.length / keywords.length) * 100)
      : 50;

    const formattingScore = Math.max(0, 100 - (formattingIssues.length * 20));

    const sectionScore = (() => {
      let score = 0;
      if (hasSummary) score += 25;
      if (hasExperience) score += 35;
      if (hasEducation) score += 20;
      if (hasSkills) score += 20;
      return score;
    })();

    const contactScore = (() => {
      let score = 0;
      if (hasEmail) score += 40;
      if (hasPhone) score += 30;
      if (hasLinkedIn) score += 30;
      return score;
    })();

    const dateScore = hasConsistentDates ? 100 : 60;

    const atsScore = Math.round(
      keywordScore * 0.40 +
      formattingScore * 0.20 +
      sectionScore * 0.20 +
      contactScore * 0.10 +
      dateScore * 0.10
    );

    // Claude analysis for bullet feedback and improvements
    const claudePrompt = `You are an expert resume coach and ATS specialist with 15 years of experience hiring for product roles.

Analyse this resume for a ${mode === "general" ? targetRoles.join(", ") : "product"} role.

RESUME:
${resumeText}

${mode === "jd_specific" ? `JOB DESCRIPTION:\n${jobDescription}` : ""}

Return ONLY a valid JSON object with this exact structure, no other text:
{
  "bullet_feedback": [
    {
      "original": "exact bullet text from resume",
      "issue": "specific problem with this bullet",
      "improved": "rewritten version with metric and impact",
      "reason": "why the improved version is better"
    }
  ],
  "section_feedback": {
    "missing_sections": ["list of missing important sections"],
    "thin_sections": ["list of sections that exist but need more content"],
    "recommendations": ["specific actionable recommendations"]
  },
  "grammar_issues": [
    {
      "text": "exact text with issue",
      "fix": "corrected version"
    }
  ],
  "summary_rewrite": "improved summary/objective section",
  "tone_check": {
    "current_level": "junior/mid/senior",
    "target_level": "junior/mid/senior",
    "is_aligned": true or false,
    "comment": "one sentence on seniority alignment"
  },
    "top_improvements": [
    {
      "priority": 1,
      "section": "which section",
      "action": "specific action to take",
      "impact": "why this matters"
    }
  ],
  "role_fit_score": null,
  "role_fit_summary": null,
  "role_fit_quick_wins": []
}

Rules:
- bullet_feedback: identify the 5 weakest bullets only
- top_improvements: list exactly 5 improvements ranked by impact
- grammar_issues: list maximum 5 most important ones
- Be specific and actionable, not generic
- improved bullets must include a metric or quantified outcome
- role_fit_score: ONLY populate if a job description is provided. Score 0-100 based on how well the candidate's experience and skills match the specific role requirements. Consider seniority match, domain match, and skills overlap. Set to null for general mode.
- role_fit_summary: ONLY populate if a job description is provided. 2 sentences max — plain English assessment of fit. Set to null for general mode.
- role_fit_quick_wins: ONLY populate if a job description is provided. 2-3 specific things to add or change to improve fit for this exact role. Empty array for general mode.`;

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: claudePrompt }]
    });

    let claudeAnalysis;
    try {
      const rawText = claudeResponse.content[0].type === "text"
        ? claudeResponse.content[0].text
        : "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      claudeAnalysis = JSON.parse(cleaned);
    } catch {
      claudeAnalysis = {
        bullet_feedback: [],
        section_feedback: { missing_sections: [], thin_sections: [], recommendations: [] },
        grammar_issues: [],
        summary_rewrite: "",
        tone_check: { current_level: "mid", target_level: "mid", is_aligned: true, comment: "" },
        top_improvements: []
      };
    }

    // Tag missing keywords by priority
    const missingWithPriority = missing.map((keyword, index) => ({
      keyword,
      priority: index < Math.ceil(missing.length * 0.3) ? "high" :
                index < Math.ceil(missing.length * 0.6) ? "medium" : "low"
    }));

    const analysisResult = {
      ats_score: atsScore,
      sub_scores: {
        keyword_coverage: keywordScore,
        formatting_safety: formattingScore,
        section_completeness: sectionScore,
        contact_info: contactScore,
        date_consistency: dateScore,
      },
      keyword_analysis: {
        total_keywords: keywords.length,
        found_count: found.length,
        missing_count: missing.length,
        found,
        missing: missingWithPriority,
      },
      bullet_feedback: claudeAnalysis.bullet_feedback || [],
      section_feedback: claudeAnalysis.section_feedback || {},
      grammar_issues: claudeAnalysis.grammar_issues || [],
      summary_rewrite: claudeAnalysis.summary_rewrite || "",
      tone_check: claudeAnalysis.tone_check || {},
      top_improvements: claudeAnalysis.top_improvements || [],
      role_fit_score: claudeAnalysis.role_fit_score || null,
      role_fit_summary: claudeAnalysis.role_fit_summary || null,
      role_fit_quick_wins: claudeAnalysis.role_fit_quick_wins || [],
      mode,
      target_roles: mode === "general" ? targetRoles : [],
      };

    // Save to database
    const { data: savedAnalysis, error: dbError } = await supabaseAdmin
      .from("analyses")
      .insert({
        user_id: user.id,
        resume_id: resume.id,
        mode,
        target_roles: mode === "general" ? targetRoles : [],
        job_description: mode === "jd_specific" ? jobDescription : null,
        ats_score: atsScore,
        sub_scores: analysisResult.sub_scores,
        keyword_gaps: analysisResult.keyword_analysis,
        bullet_feedback: claudeAnalysis.bullet_feedback,
        section_feedback: claudeAnalysis.section_feedback,
        grammar_issues: claudeAnalysis.grammar_issues,
        improvement_guide: {
          summary_rewrite: claudeAnalysis.summary_rewrite,
          tone_check: claudeAnalysis.tone_check,
          top_improvements: claudeAnalysis.top_improvements,
          role_fit_score: claudeAnalysis.role_fit_score || null,
          role_fit_summary: claudeAnalysis.role_fit_summary || null,
          role_fit_quick_wins: claudeAnalysis.role_fit_quick_wins || [],
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Analysis save error:", dbError);
    }

    return NextResponse.json({
      analysis: analysisResult,
      analysisId: savedAnalysis?.id || null,
    });

  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}
