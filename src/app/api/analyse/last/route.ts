import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

    const { data: analysis } = await supabaseAdmin
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!analysis) {
      return NextResponse.json({ analysis: null });
    }

    // Reconstruct the analysis result object
    const analysisResult = {
      ats_score: analysis.ats_score,
      sub_scores: analysis.sub_scores,
      keyword_analysis: analysis.keyword_gaps,
      bullet_feedback: analysis.bullet_feedback,
      section_feedback: analysis.section_feedback,
      grammar_issues: analysis.grammar_issues,
      summary_rewrite: analysis.improvement_guide?.summary_rewrite || "",
      tone_check: analysis.improvement_guide?.tone_check || {},
      top_improvements: analysis.improvement_guide?.top_improvements || [],
      role_fit_score: analysis.improvement_guide?.role_fit_score || null,
      role_fit_summary: analysis.improvement_guide?.role_fit_summary || null,
      role_fit_quick_wins: analysis.improvement_guide?.role_fit_quick_wins || [],
      mode: analysis.mode,
      target_roles: analysis.target_roles,
    };

    return NextResponse.json({ analysis: analysisResult });

  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
