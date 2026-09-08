import type { Metadata } from "next";
import Image from "next/image";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story and philosophy behind LOOMS.",
};

export const dynamic = "force-dynamic";

const DEFAULT_ABOUT = {
  eyebrow: "OUR POINT OF VIEW",
  title:
    "A wardrobe for moving softly through the world.",
  description:
    "LOOMS is an ongoing study in ease, texture, and daily rituals. We believe modest wear can feel beautifully instinctive—an expression of presence rather than performance.",
  image_url:
    "/images/editorial-olive.svg",
  philosophy_eyebrow:
    "THE LOOMS PHILOSOPHY",
  philosophy_title:
    "Considered, never complicated.",
  philosophy_description:
    "We begin with a feeling: a colour that settles the eye, a fabric that moves with you, a detail that earns its place. Each LOOMS piece is designed to quietly support your rhythm.",
  intention_eyebrow:
    "MADE WITH INTENTION",
  intention_title:
    "Less noise. More meaning.",
  intention_description:
    "This is editable editorial content prepared for the future LOOMS CMS. It can grow into a clear account of material choices, collaborators, and the people who bring each collection to life.",
};

async function getAbout() {
  try {
    const client =
      createSupabaseServiceClient();

    const { data, error } =
      await client
        .from("website_about")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
      console.error(
        "Failed to load public About:",
        error
      );

      return DEFAULT_ABOUT;
    }

    return {
      ...DEFAULT_ABOUT,
      ...(data ?? {}),
    };
  } catch (error) {
    console.error(
      "Public About error:",
      error
    );

    return DEFAULT_ABOUT;
  }
}

export default async function AboutPage() {
  const about =
    await getAbout();

  return (
    <main>

      {/* ==========================================
          HEADER
      ========================================== */}
      <section className="mx-auto max-w-[1100px] px-5 py-20 text-center lg:py-28">

        <p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">
          {about.eyebrow}
        </p>

        <h1 className="mx-auto mt-5 max-w-3xl whitespace-pre-line font-display text-5xl leading-[.95] md:text-7xl">
          {about.title}
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-sm leading-8 text-looms-gray">
          {about.description}
        </p>

      </section>

      {/* ==========================================
          PHILOSOPHY
      ========================================== */}
      <section className="grid bg-looms-teal text-looms-cream lg:grid-cols-2">

        <div className="relative min-h-[36rem]">

          <Image
            src={
              about.image_url ||
              "/images/editorial-olive.svg"
            }
            alt="LOOMS About"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />

        </div>

        <div className="flex items-center px-6 py-20 lg:px-[max(3rem,8vw)]">

          <div>

            <p className="text-[10px] font-medium tracking-[0.16em] text-looms-cream/65">
              {about.philosophy_eyebrow}
            </p>

            <h2 className="mt-5 font-display text-5xl leading-none">
              {about.philosophy_title}
            </h2>

            <p className="mt-7 max-w-md text-sm leading-8 text-looms-cream/75">
              {about.philosophy_description}
            </p>

          </div>

        </div>

      </section>

      {/* ==========================================
          INTENTION
      ========================================== */}
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">

        <div>

          <p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">
            {about.intention_eyebrow}
          </p>

          <h2 className="mt-4 whitespace-pre-line font-display text-5xl leading-none">
            {about.intention_title}
          </h2>

        </div>

        <div className="max-w-lg text-sm leading-8 text-looms-gray">
          {about.intention_description}
        </div>

      </section>

    </main>
  );
}
