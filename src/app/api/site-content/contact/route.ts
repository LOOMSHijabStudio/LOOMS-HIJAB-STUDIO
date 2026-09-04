import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("site_content")
      .select(
        "contact_email, contact_whatsapp, contact_instagram, contact_tiktok, contact_studio"
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Contact content error:", error);

      return NextResponse.json(
        { error: "Failed to load contact content" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contact_email: data?.contact_email ?? "",
      contact_whatsapp: data?.contact_whatsapp ?? "",
      contact_instagram: data?.contact_instagram ?? "",
      contact_tiktok: data?.contact_tiktok ?? "",
      contact_studio: data?.contact_studio ?? "",
    });
  } catch (error) {
    console.error("Contact API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
