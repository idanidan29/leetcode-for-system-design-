import Link from "next/link";

export function PrimaryBtn({
  children,
  href = "/signup",
}: {
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-[10px] bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-md transition hover:-translate-y-px"
    >
      {children}
      <svg
        className="transition-transform group-hover:translate-x-[3px]"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
      >
        <path
          d="M1 7h12m0 0L8 2m5 5l-5 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}

export function OutlineBtn({
  children,
  href = "#",
}: {
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-[10px] border border-ink bg-transparent px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}
