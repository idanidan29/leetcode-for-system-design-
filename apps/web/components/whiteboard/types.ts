/**
 * Every component kind the palette can offer, across BOTH disciplines.
 * Filtered at render time by the `discipline` field on each definition.
 */

export type ComponentKind =
  // ─── System-design kinds ─────────────────────────────────────────────
  | "api-gateway"
  | "load-balancer"
  | "web-server"
  | "cache"
  | "sql-db"
  | "nosql-db"
  | "queue"
  | "object-storage"
  | "cdn"
  | "microservice"
  | "external-api"
  | "search-index"
  | "websocket-gateway"
  | "worker"
  | "stream-processor"
  | "analytics-db"
  // ─── Design-pattern (UML) kinds ──────────────────────────────────────
  | "uml-class"
  | "uml-interface"
  | "uml-abstract"
  | "uml-enum"
  | "uml-note"
  // ─── Shared ───────────────────────────────────────────────────────────
  | "custom";

export type ComponentCategory =
  | "Edge"
  | "Compute"
  | "Data"
  | "Messaging"
  | "UML"
  | "Custom";

/** Which problem track a component belongs to. `both` shows up everywhere
 *  (used for the generic "Custom" rectangle). */
export type ComponentDiscipline = "system" | "pattern" | "both";

export interface ComponentDef {
  kind: ComponentKind;
  label: string;
  short: string; // 2-3 char glyph for the palette tile
  tone: "coral" | "amber" | "blue" | "acid" | "ink" | "violet";
  category: ComponentCategory;
  discipline: ComponentDiscipline;
  /** Extra search aliases — typed into the palette search box. */
  aliases?: string[];
}

export const COMPONENTS: ComponentDef[] = [
  // ─── System design ───────────────────────────────────────────────────
  { kind: "api-gateway",       label: "API Gateway",       short: "GW",  tone: "amber",  category: "Edge",      discipline: "system", aliases: ["entry", "router"] },
  { kind: "load-balancer",     label: "Load Balancer",     short: "LB",  tone: "amber",  category: "Edge",      discipline: "system", aliases: ["nginx", "haproxy"] },
  { kind: "cdn",               label: "CDN",               short: "CDN", tone: "amber",  category: "Edge",      discipline: "system", aliases: ["cloudflare", "edge", "static"] },
  { kind: "websocket-gateway", label: "WebSocket Gateway", short: "WS",  tone: "coral",  category: "Edge",      discipline: "system", aliases: ["realtime", "socket", "long-polling", "sse", "push"] },
  { kind: "web-server",        label: "Web Server",        short: "SVR", tone: "ink",    category: "Compute",   discipline: "system", aliases: ["app", "node", "http"] },
  { kind: "microservice",      label: "Microservice",      short: "µS",  tone: "acid",   category: "Compute",   discipline: "system", aliases: ["service"] },
  { kind: "worker",            label: "Worker",            short: "W",   tone: "acid",   category: "Compute",   discipline: "system", aliases: ["background", "async", "job", "celery", "sidekiq", "lambda"] },
  { kind: "external-api",      label: "External API",      short: "EXT", tone: "ink",    category: "Compute",   discipline: "system", aliases: ["3rd party", "third party"] },
  { kind: "sql-db",            label: "SQL DB",            short: "SQL", tone: "blue",   category: "Data",      discipline: "system", aliases: ["postgres", "mysql", "relational"] },
  { kind: "nosql-db",          label: "NoSQL DB",          short: "DOC", tone: "blue",   category: "Data",      discipline: "system", aliases: ["mongo", "dynamo", "document"] },
  { kind: "cache",             label: "Cache",             short: "$",   tone: "coral",  category: "Data",      discipline: "system", aliases: ["redis", "memcached"] },
  { kind: "object-storage",    label: "Object Storage",    short: "S3",  tone: "ink",    category: "Data",      discipline: "system", aliases: ["blob", "files", "s3"] },
  { kind: "search-index",      label: "Search Index",      short: "IDX", tone: "blue",   category: "Data",      discipline: "system", aliases: ["elasticsearch", "opensearch", "lucene", "trie", "es", "geoindex"] },
  { kind: "analytics-db",      label: "Analytics DB",      short: "OLAP",tone: "violet", category: "Data",      discipline: "system", aliases: ["warehouse", "bigquery", "snowflake", "clickhouse", "olap", "redshift"] },
  { kind: "queue",             label: "Queue",             short: "Q",   tone: "coral",  category: "Messaging", discipline: "system", aliases: ["kafka", "rabbitmq", "sqs", "pubsub"] },
  { kind: "stream-processor",  label: "Stream Processor",  short: "STM", tone: "coral",  category: "Messaging", discipline: "system", aliases: ["flink", "spark", "streaming", "kafka-streams", "beam"] },
  // ─── Design patterns (UML) ───────────────────────────────────────────
  // The `label` here doubles as the small stereotype caption rendered above
  // the user's text on the node (e.g. "«Interface»"). Solid rectangles for
  // concrete things, dashed for abstractions — standard UML convention.
  { kind: "uml-class",     label: "Class",         short: "C",  tone: "ink",    category: "UML",   discipline: "pattern", aliases: ["object", "type"] },
  { kind: "uml-interface", label: "«Interface»",   short: "I",  tone: "blue",   category: "UML",   discipline: "pattern", aliases: ["protocol", "contract"] },
  { kind: "uml-abstract",  label: "«Abstract»",    short: "A",  tone: "violet", category: "UML",   discipline: "pattern", aliases: ["abstract class", "base"] },
  { kind: "uml-enum",      label: "«Enum»",        short: "E",  tone: "amber",  category: "UML",   discipline: "pattern", aliases: ["enumeration"] },
  { kind: "uml-note",      label: "Note",          short: "N",  tone: "amber",  category: "UML",   discipline: "pattern", aliases: ["comment", "annotation", "remark"] },
  // ─── Shared ──────────────────────────────────────────────────────────
  { kind: "custom",            label: "Custom",            short: "+",   tone: "ink",    category: "Custom",    discipline: "both",   aliases: ["note", "text", "blank", "box"] },
];

/** Default ordering for the SYSTEM-DESIGN palette. */
export const CATEGORY_ORDER: ComponentCategory[] = ["Edge", "Compute", "Data", "Messaging", "Custom"];

/** Ordering for the DESIGN-PATTERN palette. */
export const PATTERN_CATEGORY_ORDER: ComponentCategory[] = ["UML", "Custom"];

export const COMPONENTS_BY_KIND: Record<ComponentKind, ComponentDef> =
  Object.fromEntries(COMPONENTS.map((c) => [c.kind, c])) as Record<
    ComponentKind,
    ComponentDef
  >;

// Tailwind class fragments per tone, used by both palette tiles and nodes.
export const TONE_CLASSES: Record<ComponentDef["tone"], { bg: string; border: string; text: string }> = {
  coral:  { bg: "bg-coral/15",            border: "border-coral",      text: "text-coral" },
  amber:  { bg: "bg-amber/15",            border: "border-amber",      text: "text-[#8a5b00]" },
  blue:   { bg: "bg-blue/10",             border: "border-blue",       text: "text-blue" },
  acid:   { bg: "bg-acid/20",             border: "border-acid",       text: "text-[#5a7d10]" },
  ink:    { bg: "bg-paper-2",             border: "border-ink-muted",  text: "text-ink" },
  violet: { bg: "bg-[rgba(124,58,237,0.12)]", border: "border-[#7c3aed]", text: "text-[#7c3aed]" },
};
