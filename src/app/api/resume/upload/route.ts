import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
// @ts-ignore
import pdfParse from "pdf-parse";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised - no session" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    // Upload PDF to Supabase Storage
    const filePath = `${user.id}/resume.pdf`;

    const { error: storageError } = await supabase.storage
      .from("resumes")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (storageError) {
      return NextResponse.json({ error: "Storage upload failed", detail: storageError }, { status: 500 });
    }

    // Check if resume record exists
    const { data: existing, error: fetchError } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json({ error: "Fetch error", detail: fetchError }, { status: 500 });
    }

    let resume;
    let dbError;

    if (existing) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
