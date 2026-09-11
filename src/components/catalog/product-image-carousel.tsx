"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";

export interface ProductCarouselImage {
  url: string;
  alt: string;
}

interface ProductImageCarouselProps {
  images: ProductCarouselImage[];
  productName: string;
}

export default function ProductImageCarousel({
  images,
  productName,
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] =
    useState(0);

  const safeImages =
    images.length > 0
      ? images
      : [
          {
            url: "/images/editorial-mocha.svg",
            alt: productName,
          },
        ];

  const hasMultiple =
    safeImages.length > 1;

  function goPrevious() {
    setCurrentIndex((current) =>
      current === 0
        ? safeImages.length - 1
        : current - 1
    );
  }

  function goNext() {
    setCurrentIndex((current) =>
      current ===
      safeImages.length - 1
        ? 0
        : current + 1
    );
  }

  useEffect(() => {
    setCurrentIndex(0);
  }, [images.length]);

  const currentImage =
    safeImages[currentIndex];

  return (
    <div className="relative w-full">

      {/* =================================================
          MAIN IMAGE
      ================================================= */}

      <div className="relative overflow-hidden bg-[#f2eee9]">
        <div className="relative aspect-[4/5] w-full">
          <Image
            key={currentImage.url}
            src={currentImage.url}
            alt={
              currentImage.alt ||
              productName
            }
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />

          {/* =================================================
              LEFT ARROW
          ================================================= */}

          {hasMultiple && (
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onClick={goPrevious}
              className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-xl text-looms-teal shadow-sm backdrop-blur-sm transition hover:bg-looms-teal hover:text-looms-cream"
            >
              ←
            </button>
          )}

          {/* =================================================
              RIGHT ARROW
          ================================================= */}

          {hasMultiple && (
            <button
              type="button"
              aria-label="Foto berikutnya"
              onClick={goNext}
              className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-xl text-looms-teal shadow-sm backdrop-blur-sm transition hover:bg-looms-teal hover:text-looms-cream"
            >
              →
            </button>
          )}

          {/* =================================================
              COUNTER
          ================================================= */}

          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-medium tracking-wider text-white backdrop-blur-sm">
              {currentIndex + 1} /{" "}
              {safeImages.length}
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          THUMBNAILS
      ================================================= */}

      {hasMultiple && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {safeImages.map(
            (image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() =>
                  setCurrentIndex(
                    index
                  )
                }
                aria-label={`Tampilkan foto ${index + 1}`}
                className={`relative h-20 w-16 shrink-0 overflow-hidden border bg-[#f2eee9] transition ${
                  currentIndex === index
                    ? "border-2 border-looms-teal"
                    : "border-gray-200 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt={`${productName} ${index + 1}`}
                  fill
                  sizes="64px"
                  unoptimized={image.url.startsWith(
                    "http"
                  )}
                  className="object-cover"
                />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
