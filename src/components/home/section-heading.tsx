import Link from "next/link";

export function SectionHeading({ eyebrow, title, href = "/shop" }: { eyebrow: string; title: string; href?: string }) { return <div className="mb-8 flex items-end justify-between gap-4 md:mb-10"><div><p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">{eyebrow}</p><h2 className="mt-3 font-display text-3xl leading-none text-looms-teal md:text-5xl">{title}</h2></div><Link href={href} className="shrink-0 border-b border-looms-teal pb-1 text-xs font-medium tracking-[0.1em]">VIEW ALL</Link></div>; }
