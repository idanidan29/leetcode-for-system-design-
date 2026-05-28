/**
 * The 11 system-design component kinds the palette offers. Order in this
 * array is the order they appear in the palette UI.
 */

export type ComponentKind =
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
  | "custom";

export type ComponentCategory = "Edge" | "Compute" | "Data" | "Messaging" | "Custom";

export interface ComponentDef {
  kind: ComponentKind;
  label: string;
  short: string; // 2-3 char glyph for the palette tile
  tone: "coral" | "amber" | "blue" | "acid" | "ink" | "violet";
  category: ComponentCategory;
  /** Extra search aliases — typed into the palette search box. */
  aliases?: string[];
}

export const COMPONENTS: ComponentDef[] = [
  { kind: "api-gateway",       label: "API Gateway",       short: "GW",  tone: "amber",  category: "Edge",      aliases: ["entry", "router"] },
  { kind: "load-balancer",     label: "Load Balancer",     short: "LB",  tone: "amber",  category: "Edge",      aliases: ["nginx", "haproxy"] },
  { kind: "cdn",               label: "CDN",               short: "CDN", tone: "amber",  category: "Edge",      aliases: ["cloudflare", "edge", "static"] },
  { kind: "websocket-gateway", label: "WebSocket Gateway", short: "WS",  tone: "coral",  category: "Edge",      aliases: ["realtime", "socket", "long-polling", "sse", "push"] },
  { kind: "web-server",        label: "Web Server",        short: "SVR", tone: "ink",    category: "Compute",   aliases: ["app", "node", "http"] },
  { kind: "microservice",      label: "Microservice",      short: "µS",  tone: "acid",   category: "Compute",   aliases: ["service"] },
  { kind: "worker",            label: "Worker",            short: "W",   tone: "acid",   category: "Compute",   aliases: ["background", "async", "job", "celery", "sidekiq", "lambda"] },
  { kind: "external-api",      label: "External API",      short: "EXT", tone: "ink",    category: "Compute",   aliases: ["3rd party", "third party"] },
  { kind: "sql-db",            label: "SQL DB",            short: "SQL", tone: "blue",   category: "Data",      aliases: ["postgres", "mysql", "relational"] },
  { kind: "nosql-db",          label: "NoSQL DB",          short: "DOC", tone: "blue",   category: "Data",      aliases: ["mongo", "dynamo", "document"] },
  { kind: "cache",             label: "Cache",             short: "$",   tone: "coral",  category: "Data",      aliases: ["redis", "memcached"] },
  { kind: "object-storage",    label: "Object Storage",    short: "S3",  tone: "ink",    category: "Data",      aliases: ["blob", "files", "s3"] },
  { kind: "search-index",      label: "Search Index",      short: "IDX", tone: "blue",   category: "Data",      aliases: ["elasticsearch", "opensearch", "lucene", "trie", "es", "geoindex"] },
  { kind: "analytics-db",      label: "Analytics DB",      short: "OLAP",tone: "violet", category: "Data",      aliases: ["warehouse", "bigquery", "snowflake", "clickhouse", "olap", "redshift"] },
  { kind: "queue",             label: "Queue",             short: "Q",   tone: "coral",  category: "Messaging", aliases: ["kafka", "rabbitmq", "sqs", "pubsub"] },
  { kind: "stream-processor",  label: "Stream Processor",  short: "STM", tone: "coral",  category: "Messaging", aliases: ["flink", "spark", "streaming", "kafka-streams", "beam"] },
  { kind: "custom",            label: "Custom",            short: "+",   tone: "ink",    category: "Custom",    aliases: ["note", "text", "blank", "box"] },
];

export const CATEGORY_ORDER: ComponentCategory[] = ["Edge", "Compute", "Data", "Messaging", "Custom"];

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
