export function BrandMark({ invert = false }: { invert?: boolean }) {
  return (
    <div
      className={
        "relative grid h-7 w-7 place-items-center overflow-hidden rounded-[7px] font-mono text-[13px] " +
        (invert ? "bg-bone text-night" : "bg-ink text-paper") +
        " after:absolute after:inset-0 after:content-[''] after:opacity-90 " +
        "after:bg-[linear-gradient(135deg,transparent_45%,var(--color-coral)_45%,var(--color-coral)_55%,transparent_55%)]"
      }
    >
      <span className="relative z-10">S</span>
    </div>
  );
}
