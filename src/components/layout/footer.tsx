import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-looms-teal px-5 py-14 text-looms-cream lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-12 md:grid-cols-2 lg:grid-cols-4">

        {/* BRAND */}
        <div>
          <p className="font-display text-4xl tracking-[0.15em]">
            LOOMS
          </p>

          <p className="mt-5 max-w-xs text-sm leading-6 text-looms-cream/70">
            Thoughtfully considered modest wear for your everyday rituals.
          </p>
        </div>

        {/* SHOP */}
        <div>
          <h2 className="text-xs font-medium tracking-[0.14em]">
            SHOP
          </h2>

          <div className="mt-5 flex flex-col gap-3 text-sm text-looms-cream/70">
            <Link
              href="/shop"
              className="transition hover:text-looms-cream"
            >
              All pieces
            </Link>

            <Link
              href="/shop?edit=new"
              className="transition hover:text-looms-cream"
            >
              New arrivals
            </Link>

            <Link
              href="/shop?edit=best"
              className="transition hover:text-looms-cream"
            >
              Best sellers
            </Link>
          </div>
        </div>

        {/* CUSTOMER CARE */}
        <div>
          <h2 className="text-xs font-medium tracking-[0.14em]">
            CUSTOMER CARE
          </h2>

          <div className="mt-5 flex flex-col gap-3 text-sm text-looms-cream/70">
            <Link
              href="/contact#shipping"
              className="transition hover:text-looms-cream"
            >
              Shipping
            </Link>

            <Link
              href="/contact#returns"
              className="transition hover:text-looms-cream"
            >
              Returns
            </Link>

            <Link
              href="/contact#privacy"
              className="transition hover:text-looms-cream"
            >
              Privacy Policy
            </Link>

            <Link
              href="/contact#terms"
              className="transition hover:text-looms-cream"
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>

        {/* FOLLOW ALONG */}
        <div>
          <h2 className="text-xs font-medium tracking-[0.14em]">
            FOLLOW ALONG
          </h2>

          <div className="mt-5 flex flex-col gap-3 text-sm text-looms-cream/70">

            <a
              href="https://www.instagram.com/beyond.looms"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-looms-cream"
            >
              Instagram
            </a>

            <a
              href="https://www.tiktok.com/@beyond.looms"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-looms-cream"
            >
              TikTok
            </a>

            <Link
              href="/contact"
              className="transition hover:text-looms-cream"
            >
              Contact
            </Link>

          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="mx-auto mt-14 max-w-[1440px] border-t border-looms-cream/20 pt-5 text-[11px] tracking-[0.08em] text-looms-cream/50">
        © {new Date().getFullYear()} LOOMS. ALL RIGHTS RESERVED.
      </div>
    </footer>
  );
}
