import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
// @ts-ignore
import pdfParse from "pdf-parse";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
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

    // Upload PDF to Supabase Storage
    const filePath = `${user.id}/resume.pdf`;

    const { error: storageError } = await supabase.storage
      .from("resumes")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (storageError) {
      return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
    }

    // Upsert resume record in database
    const { data: resume, error: dbError } = await supabase
      .from("resumes")
      .upsert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        extracted_text: extractedText,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ resume });

  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
