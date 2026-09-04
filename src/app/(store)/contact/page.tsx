"use client";

import { useEffect, useState } from "react";

type ContactContent = {
  contact_email: string;
  contact_whatsapp: string;
  contact_instagram: string;
  contact_tiktok: string;
  contact_studio: string;
};

export default function ContactPage() {
  const [content, setContent] = useState<ContactContent>({
    contact_email: "",
    contact_whatsapp: "",
    contact_instagram: "",
    contact_tiktok: "",
    contact_studio: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContact() {
      try {
        const response = await fetch("/api/site-content/contact", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load contact content");
        }

        const data = await response.json();

        setContent({
          contact_email: data.contact_email ?? "",
          contact_whatsapp: data.contact_whatsapp ?? "",
          contact_instagram: data.contact_instagram ?? "",
          contact_tiktok: data.contact_tiktok ?? "",
          contact_studio: data.contact_studio ?? "",
        });
      } catch (error) {
        console.error("Failed to load contact content:", error);
      } finally {
        setLoading(false);
      }
    }

    loadContact();
  }, []);

  const whatsappNumber = content.contact_whatsapp.replace(/\D/g, "");

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f1e8] text-[#151515]">
        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-sm tracking-[0.2em] uppercase">
            Loading...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#151515]">
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <div className="max-w-3xl">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-[#777]">
            Contact
          </p>

          <h1 className="text-5xl font-light tracking-[-0.04em] md:text-7xl">
            Let&apos;s talk.
          </h1>

          <p className="mt-8 max-w-xl text-base leading-7 text-[#666]">
            For inquiries, collaborations, appointments, or anything else,
            feel free to reach out to us.
          </p>
        </div>

        <div className="mt-20 grid gap-16 md:grid-cols-2">
          {/* CONTACT */}
          <div>
            <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[#777]">
              Contact
            </h2>

            <div className="space-y-5 text-base">
              {content.contact_email && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#999]">
                    Email
                  </p>

                  <a
                    href={`mailto:${content.contact_email}`}
                    className="underline underline-offset-4 transition-opacity hover:opacity-60"
                  >
                    {content.contact_email}
                  </a>
                </div>
              )}

              {whatsappNumber && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#999]">
                    WhatsApp
                  </p>

                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 transition-opacity hover:opacity-60"
                  >
                    Chat via WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* SOCIAL */}
          <div>
            <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[#777]">
              Social
            </h2>

            <div className="space-y-5 text-base">
              {content.contact_instagram && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#999]">
                    Instagram
                  </p>

                  <a
                    href={content.contact_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 transition-opacity hover:opacity-60"
                  >
                    Instagram
                  </a>
                </div>
              )}

              {content.contact_tiktok && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#999]">
                    TikTok
                  </p>

                  <a
                    href={content.contact_tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 transition-opacity hover:opacity-60"
                  >
                    TikTok
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* STUDIO */}
          <div>
            <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[#777]">
              Studio
            </h2>

            <p className="text-base leading-7">
              {content.contact_studio}
              <br />
              By appointment only
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
