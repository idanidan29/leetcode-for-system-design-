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
  | "external-api";

export interface ComponentDef {
  kind: ComponentKind;
  label: string;
  short: string; // 2-3 char glyph for the palette tile
  tone: "coral" | "amber" | "blue" | "acid" | "ink";
}

export const COMPONENTS: ComponentDef[] = [
  { kind: "api-gateway",    label: "API Gateway",    short: "GW",  tone: "amber" },
  { kind: "load-balancer",  label: "Load Balancer",  short: "LB",  tone: "amber" },
  { kind: "web-server",     label: "Web Server",     short: "SVR", tone: "ink" },
  { kind: "cache",          label: "Cache",          short: "$",   tone: "coral" },
  { kind: "sql-db",         label: "SQL DB",         short: "SQL", tone: "blue" },
  { kind: "nosql-db",       label: "NoSQL DB",       short: "DOC", tone: "blue" },
  { kind: "queue",          label: "Queue",          short: "Q",   tone: "coral" },
  { kind: "object-storage", label: "Object Storage", short: "S3",  tone: "ink" },
  { kind: "cdn",            label: "CDN",            short: "CDN", tone: "amber" },
  { kind: "microservice",   label: "Microservice",   short: "µS",  tone: "acid" },
  { kind: "external-api",   label: "External API",   short: "EXT", tone: "ink" },
];

export const COMPONENTS_BY_KIND: Record<ComponentKind, ComponentDef> =
  Object.fromEntries(COMPONENTS.map((c) => [c.kind, c])) as Record<
    ComponentKind,
    ComponentDef
  >;

// Tailwind class fragments per tone, used by both palette tiles and nodes.
export const TONE_CLASSES: Record<ComponentDef["tone"], { bg: string; border: string; text: string }> = {
  coral: { bg: "bg-coral/15", border: "border-coral",     text: "text-coral" },
  amber: { bg: "bg-amber/15", border: "border-amber",     text: "text-[#8a5b00]" },
  blue:  { bg: "bg-blue/10",  border: "border-blue",      text: "text-blue" },
  acid:  { bg: "bg-acid/20",  border: "border-acid",      text: "text-[#5a7d10]" },
  ink:   { bg: "bg-paper-2",  border: "border-ink-muted", text: "text-ink" },
};
