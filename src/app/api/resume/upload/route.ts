import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
// @ts-ignore
import pdfParse from "pdf-parse";

export async function POST(request: Request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorised - no token" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    // Create service role client to verify user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorised - invalid token" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF files only" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    // Upload to Supabase Storage
    const filePath = `${user.id}/resume.pdf`;

    const { error: storageError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (storageError) {
      return NextResponse.json({ error: "Storage upload failed", detail: storageError }, { status: 500 });
    }

    // Check if resume record exists
    const { data: existing } = await supabaseAdmin
      .from("resumes")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let resume;
    let dbError;

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("resumes")
        .update({
          file_name: file.name,
          file_path: filePath,
          extracted_text: extractedText,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();
      resume = data;
      dbError = error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          extracted_text: extractedText,
        })
        .select()
        .single();
      resume = data;
      dbError = error;
    }

    if (dbError) {
      return NextResponse.json({ error: "Database error", detail: dbError }, { status: 500 });
    }

    return NextResponse.json({ resume });

  } catch (err) {
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}
