// Central domain types — shared across lib/, adapters/, and index.ts.

// ── Brand profile ────────────────────────────────────────────────────────────

export interface VoiceConfig {
  tone: string;
  audience: string;
  register: string;
  emoji_policy: string;
  banned_words: string[];
  do: string[];
  dont: string[];
}

export interface HashtagConfig {
  default: string[];
  sets: Record<string, string[]>;
}

export interface VisualConfig {
  accent: string;
  bg_color: string;
  surface: string;
  heading_color: string;
  body_color: string;
  logo_url: string;
  icon_url: string;
  handle: string;
  default_template: string;
}

export interface LinkConfig {
  utm_defaults: Record<string, string>;
  shortener: string | null;
}

export interface PolicyDisclosures {
  always: string[];
  sponsored: string[];
}

export interface PolicyConfig {
  banned_topics: string[];
  disclosures: PolicyDisclosures;
  auto_publish: boolean;
}

export interface VoiceDelta {
  tone?: string;
  register?: string;
  emoji_policy?: string;
  audience?: string;
  hashtags?: string[];
  cta?: string[];
}

export interface BrandProfile {
  voice: VoiceConfig;
  hashtags: HashtagConfig;
  cta: string[];
  visual: VisualConfig;
  links: LinkConfig;
  platforms: Record<string, VoiceDelta>;
  audiences: Record<string, Omit<VoiceDelta, 'audience'>>;
  policy: PolicyConfig;
  notes: string;
}

// ── Platform specs ───────────────────────────────────────────────────────────

export interface TextSpec {
  field: string;
  max: number;
  unit: 'chars' | 'graphemes';
  required: boolean;
}

export interface MediaSpec {
  field: string;
  kind: 'image' | 'video';
  required: boolean;
  carousel?: { field: string; min: number; max: number };
}

export interface ThreadSpec {
  field: string;
  perItemMax: number;
}

export interface PlatformSpec {
  label: string;
  text: TextSpec;
  thread?: ThreadSpec;
  media?: MediaSpec;
  altText?: boolean;
  firstComment?: boolean;
  credentials: string[];
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  platform: string;
  label?: string;
  errors: string[];
  warnings: string[];
  notes?: string[];
}

export interface PolicyCheckResult {
  errors: string[];
  warnings: string[];
  notes: string[];
}

// ── Publish ──────────────────────────────────────────────────────────────────

export interface PublishResult {
  summary: string;
  raw: Record<string, unknown>;
}

// ── Queue ────────────────────────────────────────────────────────────────────

export type QueueStatus = 'draft' | 'pending' | 'dispatched' | 'published' | 'failed';

export interface QueueItem {
  id: string;
  platform: string;
  content: Record<string, unknown>;
  account: string;
  // Whether this post is sponsored/paid — persisted so the dispatch-time policy
  // gate can enforce the brand kit's sponsored disclosures (INIT-005). Optional:
  // items queued before this field existed deserialize as undefined = not sponsored.
  sponsored?: boolean;
  status: QueueStatus;
  scheduled_at: string | null;
  created_at: string;
  published_at: string | null;
  result: string | null;
  error: string | null;
}

// ── Audit ────────────────────────────────────────────────────────────────────

export type AuditStatus = 'published' | 'failed' | 'dry_run';
export type AuditSource = 'direct' | 'queue' | 'scheduler';

export interface AuditEntry {
  ts: string;
  platform: string;
  account: string | null;
  source: AuditSource;
  content_hash: string;
  status: AuditStatus;
  result?: string;
  error?: string;
  post_id?: string | null;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  ts: string;
  platform: string;
  account: string | null;
  post_id: string;
  metrics: Record<string, unknown>;
}

// ── Followups ────────────────────────────────────────────────────────────────

export interface FollowupJob {
  id: string;
  platform: string;
  post_id: string;
  account: string | null;
  created_at: string;
  due_at: string;
  attempts: number;
}

// ── Rate limits ──────────────────────────────────────────────────────────────

export interface RateLimitEntry {
  count: number;
  first_seen: string;
  last_seen: string | null;
  last_message: string | null;
}

// ── Tools (MCP) ──────────────────────────────────────────────────────────────

export interface JSONSchemaProp {
  type?: string;
  description?: string;
  enum?: string[];
  items?: { type: string; enum?: string[] };
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProp>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

// ── Brand-kit field schema ───────────────────────────────────────────────────

export type FieldType = 'text' | 'enum' | 'multiselect' | 'list' | 'datetime' | 'color' | 'url' | 'bool';

export interface BrandField {
  path: string;
  label: string;
  type: FieldType;
  group: string;
  help: string;
  options?: string[];
  recommended?: boolean;
  set?: boolean;
  current?: unknown;
}

export interface BriefField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  requiredIf?: string;
  help: string;
  options?: string[];
  brandKitPath: string | null;
  prefill?: unknown;
}

// ── Override fields ──────────────────────────────────────────────────────────

export interface OverrideField {
  key: keyof VoiceDelta | 'audience';
  basePath: string;
  label: string;
  type: 'text' | 'enum' | 'list';
}

// ── Voice resolution ─────────────────────────────────────────────────────────

export interface ResolvedVoice {
  platform: string | undefined;
  audience: string | undefined;
  effective: Record<string, string | string[]>;
  overridden: string[];
  sources: Record<string, 'base' | 'audience' | 'platform'>;
  unknownAudience: boolean;
}

// ── Media upload ─────────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  provider: 'cloudinary' | 'imgbb';
  public_id?: string;
  resource?: 'image' | 'video';
  format?: string;
  bytes?: number;
}

// ── Compose ──────────────────────────────────────────────────────────────────

export interface ComposeResult extends UploadResult {
  template: string;
  dimensions: { width: number; height: number };
}

// ── Best times ───────────────────────────────────────────────────────────────

export interface TimeWindow {
  day: string;
  time: string;
  score: number;
  source: 'research' | 'your-data';
  note: string;
}

export interface BestTimesResult {
  platform: string;
  label: string;
  has_own_data: boolean;
  windows: TimeWindow[];
}

// ── Account overview ─────────────────────────────────────────────────────────

export interface AccountRow {
  name: string;
  account: string;
  isDefault: boolean;
  active: boolean;
  brandProfile: boolean;
  platforms: string[];
}

export interface AccountsOverview {
  active: string;
  rows: AccountRow[];
}
