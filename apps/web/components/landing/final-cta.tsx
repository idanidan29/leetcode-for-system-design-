import { OutlineBtn, PrimaryBtn } from "./buttons";

export function FinalCTA() {
  return (
    <section className="relative bg-paper px-7 pt-[140px] pb-[120px] text-center">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="mx-0 mb-7 text-[clamp(48px,7vw,96px)] font-semibold leading-[0.95] tracking-[-0.035em]">
          Stop reading.
          <br />
          <span className="font-script font-medium italic text-coral">Start sketching.</span>
        </h2>
        <p className="mx-auto mb-10 max-w-[50ch] text-[19px] text-ink-soft">
          Your next interview won&apos;t reward you for memorizing patterns. It&apos;ll
          reward you for making the right call under pressure. Build that reflex
          here.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryBtn>Start drilling — free</PrimaryBtn>
          <OutlineBtn>Browse problems</OutlineBtn>
        </div>
      </div>
    </section>
  );
}
