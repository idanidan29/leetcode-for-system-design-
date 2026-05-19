// ─── Pipeline section: 4 steps explaining "how it works" ──────────────────────

function MiniProblemPick() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <rect x="10" y="14" width="200" height="22" rx="6" fill="var(--color-night-line)" />
      <rect x="14" y="20" width="80" height="10" rx="3" fill="var(--color-bone-mute)" />
      <rect x="178" y="20" width="28" height="10" rx="3" fill="var(--color-coral)" opacity="0.6" />
      <rect x="10" y="44" width="200" height="22" rx="6" fill="var(--color-coral)" opacity="0.18" stroke="var(--color-coral)" />
      <rect x="14" y="50" width="110" height="10" rx="3" fill="var(--color-coral)" />
      <rect x="178" y="50" width="28" height="10" rx="3" fill="var(--color-amber)" opacity="0.7" />
      <rect x="10" y="74" width="200" height="22" rx="6" fill="var(--color-night-line)" />
      <rect x="14" y="80" width="60" height="10" rx="3" fill="var(--color-bone-mute)" />
      <rect x="178" y="80" width="28" height="10" rx="3" fill="var(--color-red)" opacity="0.6" />
    </svg>
  );
}

function MiniDraw() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <defs>
        <marker id="mh" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--color-bone-soft)" />
        </marker>
      </defs>
      <rect x="10"  y="40" width="44" height="26" rx="5" fill="none" stroke="var(--color-bone-soft)" strokeWidth="1.5" />
      <rect x="86"  y="40" width="44" height="26" rx="5" fill="none" stroke="var(--color-coral)"     strokeWidth="1.5" />
      <rect x="162" y="14" width="44" height="26" rx="5" fill="none" stroke="var(--color-blue)"      strokeWidth="1.5" />
      <rect x="162" y="66" width="44" height="26" rx="5" fill="none" stroke="var(--color-amber)"     strokeWidth="1.5" />
      <path d="M 54 53 L 86 53"   stroke="var(--color-bone-soft)" strokeWidth="1.5" markerEnd="url(#mh)" />
      <path d="M 130 47 L 162 28" stroke="var(--color-bone-soft)" strokeWidth="1.5" markerEnd="url(#mh)" />
      <path d="M 130 59 L 162 78" stroke="var(--color-bone-soft)" strokeWidth="1.5" markerEnd="url(#mh)" />
      <text x="22"  y="56" fontSize="8" fill="var(--color-bone-mute)" fontFamily="var(--font-mono)">CLI</text>
      <text x="92"  y="56" fontSize="8" fill="var(--color-coral)"     fontFamily="var(--font-mono)">API</text>
      <text x="170" y="30" fontSize="8" fill="var(--color-blue)"      fontFamily="var(--font-mono)">DB</text>
      <text x="170" y="82" fontSize="8" fill="var(--color-amber)"     fontFamily="var(--font-mono)">CACHE</text>
    </svg>
  );
}

function MiniEvaluate() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <rect x="10" y="10" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="10" width="160" height="14" rx="4" fill="var(--color-acid)" opacity="0.7" />
      <text x="14" y="20" fontSize="8" fill="var(--color-night)" fontFamily="var(--font-mono)">SCALABILITY 4/5</text>
      <rect x="10" y="32" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="32" width="120" height="14" rx="4" fill="var(--color-amber)" opacity="0.85" />
      <text x="14" y="42" fontSize="8" fill="var(--color-night)" fontFamily="var(--font-mono)">SECURITY 3/5</text>
      <rect x="10" y="54" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="54" width="80"  height="14" rx="4" fill="var(--color-red)" opacity="0.8" />
      <text x="14" y="64" fontSize="8" fill="var(--color-bone)" fontFamily="var(--font-mono)">COST 2/5</text>
      <rect x="10" y="76" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="76" width="180" height="14" rx="4" fill="var(--color-acid)" opacity="0.7" />
      <text x="14" y="86" fontSize="8" fill="var(--color-night)" fontFamily="var(--font-mono)">PERFORMANCE 4.5/5</text>
    </svg>
  );
}

function MiniIterate() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <circle cx="110" cy="55" r="40" fill="none" stroke="var(--color-coral)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" from="0 110 55" to="360 110 55" dur="9s" repeatCount="indefinite" />
      </circle>
      <circle cx="110" cy="55" r="22" fill="none" stroke="var(--color-acid)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="360 110 55" to="0 110 55" dur="6s" repeatCount="indefinite" />
      </circle>
      <text x="110" y="50" fontSize="10" textAnchor="middle" fill="var(--color-bone)" fontFamily="var(--font-mono)">SCORE</text>
      <text x="110" y="64" fontSize="14" textAnchor="middle" fill="var(--color-acid)" fontFamily="var(--font-mono)" fontWeight="600">4.2</text>
    </svg>
  );
}

interface PipelineStepProps {
  num: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}

function PipelineStep({ num, title, desc, children }: PipelineStepProps) {
  return (
    <div className="relative flex min-h-[320px] flex-col border-r border-night-line p-7 pb-8 last:border-r-0">
      <div className="absolute right-7 top-7 grid h-7 w-7 place-items-center rounded-full border border-night-line bg-night-3 font-mono text-[11px] text-bone-mute">
        {num}
      </div>
      <div className="mb-[18px] font-mono text-[11px] tracking-[0.14em] text-coral">STEP {num}</div>
      <h3 className="mb-2.5 text-[22px] font-semibold tracking-tight text-bone">{title}</h3>
      <p className="mb-[18px] text-sm leading-[1.55] text-bone-soft">{desc}</p>
      <div className="relative mt-auto flex h-[130px] items-center justify-center overflow-hidden rounded-xl border border-night-line bg-night-3 p-3">
        {children}
      </div>
    </div>
  );
}

const DOT_NIGHT_BG =
  "bg-night bg-[radial-gradient(circle_at_1px_1px,rgba(239,231,211,0.06)_1px,transparent_0)] bg-[length:28px_28px]";

export function Pipeline() {
  return (
    <section id="sk-pipeline" className={`${DOT_NIGHT_BG} py-[120px]`}>
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mb-16 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-mute">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
            HOW IT WORKS
          </span>
          <h2 className="mx-0 my-[14px] mb-[18px] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em] text-bone">
            From blank canvas to staff-engineer feedback in four steps.
          </h2>
          <p className="mx-auto max-w-[60ch] text-[18px] text-bone-soft">
            No interviewer to wait for. No vague &ldquo;good job&rdquo; or &ldquo;go deeper.&rdquo; Every diagram you ship gets a structured, opinionated review you can actually act on.
          </p>
        </div>
        <div
          className={
            "relative grid grid-cols-1 overflow-hidden rounded-[22px] border border-night-line " +
            "bg-gradient-to-b from-night-2 to-night md:grid-cols-2 lg:grid-cols-4 " +
            "before:absolute before:inset-x-0 before:top-[100px] before:h-px before:opacity-40 before:content-[''] " +
            "before:bg-[repeating-linear-gradient(90deg,var(--color-coral)_0_6px,transparent_6px_16px)] before:pointer-events-none"
          }
        >
          <PipelineStep num="01" title="Pick a problem" desc="A curated catalog of real interview prompts — URL shortener, chat, rate limiter, payment flows — each with functional and non-functional requirements baked in."><MiniProblemPick /></PipelineStep>
          <PipelineStep num="02" title="Sketch the system" desc="An infinite canvas with the components that actually matter: gateways, load balancers, caches, queues, databases, CDNs. Drag, connect, label."><MiniDraw /></PipelineStep>
          <PipelineStep num="03" title="Get evaluated" desc="One click. Your diagram is reviewed across six rubric categories — with concrete strengths, severity-tagged issues, and suggested fixes."><MiniEvaluate /></PipelineStep>
          <PipelineStep num="04" title="Iterate & level up" desc="Apply the feedback. Re-submit. Watch your scores climb. Every problem becomes a private gym for the architecture muscles interviewers test."><MiniIterate /></PipelineStep>
        </div>
      </div>
    </section>
  );
}
