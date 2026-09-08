import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export interface WebsiteAppearance {
  announcementText: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: string;
  editorialEyebrow: string;
  editorialTitle: string;
  editorialDescription: string;
  editorialImage: string;
  storyTitle: string;
  storyDescription: string;
  storyImage: string;
  whatsappNumber: string;
}

export const defaultAppearance: WebsiteAppearance = {
  announcementText:
    "COMPLIMENTARY SHIPPING ON ORDERS OVER IDR 500.000",

  heroEyebrow:
    "THE FIRST EDIT",

  heroTitle:
    "LOOMS\nPremium Hijab Collection",

  heroDescription:
    "Everyday pieces, thoughtfully composed—made for the beauty of an unhurried morning and the life that follows.",

  heroImage:
    "/images/editorial-sand.svg",

  editorialEyebrow:
    "THE NEW ARRIVALS",

  editorialTitle:
    "A softer kind of presence.",

  editorialDescription:
    "Ease into a collection shaped by precise drape, rich tonal stories, and the luxury of quiet detail.",

  editorialImage:
    "/images/editorial-teal.svg",

  storyTitle:
    "Made for the spaces between.",

  storyDescription:
    "We design for the small rituals that bring a day into focus: the first fold, a familiar tone, the feeling of being wholly yourself.",

  storyImage:
    "/images/editorial-mocha.svg",

  whatsappNumber:
    "6281558066629",
};

export async function getWebsiteAppearance(): Promise<WebsiteAppearance> {
  try {
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from("website_appearance")
      .select("data")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "Failed to load website appearance:",
        error
      );

      return { ...defaultAppearance };
    }

    const stored =
      data?.data &&
      typeof data.data === "object" &&
      !Array.isArray(data.data)
        ? (data.data as Partial<WebsiteAppearance>)
        : {};

    return {
      ...defaultAppearance,
      ...stored,
    };
  } catch (error) {
    console.error(
      "Website appearance load error:",
      error
    );

    return { ...defaultAppearance };
  }
}

export async function updateWebsiteAppearance(
  updates: Partial<WebsiteAppearance>
): Promise<WebsiteAppearance> {
  const current =
    await getWebsiteAppearance();

  const updated: WebsiteAppearance = {
    ...current,
    ...updates,
  };

  const client =
    createSupabaseServiceClient();

  const { error } = await client
    .from("website_appearance")
    .upsert(
      {
        id: 1,
        data: updated,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

  if (error) {
    console.error(
      "Failed to save website appearance:",
      error
    );

    throw error;
  }

  return updated;
}
