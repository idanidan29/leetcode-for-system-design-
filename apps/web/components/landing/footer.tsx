import { BrandMark } from "@/components/brand-mark";

export function Footer() {
  return (
    <footer className="border-t border-night-line bg-night px-7 pt-[50px] pb-9 text-bone-mute">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight text-bone">
            <BrandMark invert />
            <span>sketchd</span>
          </div>
          <div className="flex flex-wrap gap-14">
            <FooterColumn title="Product">
              <FooterLink href="#sk-problems">Problems</FooterLink>
              <FooterLink href="#sk-pipeline">How it works</FooterLink>
              <FooterLink href="#sk-benefits">Why sketchd</FooterLink>
            </FooterColumn>
            <FooterColumn title="Learn">
              <FooterLink href="#">Guides</FooterLink>
              <FooterLink href="#">Sample evaluations</FooterLink>
              <FooterLink href="#">Changelog</FooterLink>
            </FooterColumn>
            <FooterColumn title="Project">
              <FooterLink href="#">GitHub</FooterLink>
              <FooterLink href="#">Roadmap</FooterLink>
              <FooterLink href="#">Contact</FooterLink>
            </FooterColumn>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-night-line pt-6 font-mono text-[11px] text-bone-mute">
          <span>© {new Date().getFullYear()} sketchd</span>
          <span>built with FastAPI · Next.js · Groq</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone">
        {title}
      </h5>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href={href}>
      {children}
    </a>
  );
}
