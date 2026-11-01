// Shapes of the admin API (kite-service, /v1/admin). Dates are ISO strings.

export type Role = "owner" | "admin" | "staff"

export interface Me {
  user_id: string
  discord_id: string
  role: Role
  display_name: string
  discord_username: string
  discord_avatar: string | null
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ---- users & apps

export interface UserItem {
  id: string
  email: string
  display_name: string
  discord_id: string
  discord_username: string
  discord_avatar: string | null
  plan: string
  apps_count: number
  created_at: string
}

export interface UserDetail extends UserItem {
  apps: { id: string; name: string; enabled: boolean; created_at: string }[]
  subscription: {
    id: string
    status: string
    display_name: string
    renews_at: string | null
    ends_at: string | null
  } | null
  updated_at: string
}

export interface AppItem {
  id: string
  name: string
  owner_id: string
  owner_email: string | null
  enabled: boolean
  discord_status: unknown
  disabled_reason: string | null
  credits_used: number
  collaborators_count: number
  created_at: string
}

export interface AppDetail {
  id: string
  name: string
  description: string | null
  owner_id: string
  owner_email: string | null
  creator_user_id: string
  enabled: boolean
  discord_id: string
  discord_status: unknown
  disabled_reason: string | null
  collaborators: { user_id: string; role: string }[]
  credits_used: number
  resume_points_count: number
  created_at: string
  updated_at: string
}

// ---- billing

export interface SubscriptionItem {
  id: string
  user_id: string
  user_email: string | null
  display_name: string
  source: string
  status: string
  renews_at: string | null
  trial_ends_at: string | null
  ends_at: string | null
  created_at: string
}

export interface EntitlementItem {
  id: string
  type: string
  app_id: string
  app_name: string | null
  subscription_id: string | null
  plan_id: string
  ends_at: string | null
  created_at: string
}

export interface PaymentSessionItem {
  id: string
  payment_id: string
  app_id: string
  app_name: string | null
  plan_id: string
  provider: string
  amount: number
  status: string
  paid_at: string | null
  created_at: string
}

// ---- logs, dashboard, revenue

export interface LogItem {
  id: number
  app_id: string
  app_name: string | null
  message: string
  level: string
  command_id: string | null
  event_listener_id: string | null
  message_id: string | null
  created_at: string
}

export interface DashboardData {
  stats: {
    total_users: number
    total_apps: number
    active_apps: number
    disabled_apps: number
    errors_24h: number
    errors_prev_24h: number
    total_credits: number
    active_subscriptions: number
  }
  usage_chart: { date: string; credits: number; errors: number }[]
  recent_logs: {
    id: number
    app_id: string
    app_name: string | null
    message: string
    level: string
    created_at: string
  }[]
}

export type RevenuePeriod = "day" | "week" | "month"

export interface RevenueSummary {
  total: number
  count: number
  prev_total: number
  prev_count: number
}

export interface RevenuePoint {
  date: string
  total: number
  count: number
}

export interface SubscriptionStats {
  active: number
  cancelled: number
  trial: number
  total: number
}

// ---- plans

export interface Plan {
  id: string
  title: string
  description: string
  price: number
  payment_amount: number
  premium_duration_days: number
  default: boolean
  popular: boolean
  hidden: boolean
  archived: boolean
  sort_order: number
  lemonsqueezy_product_id: string
  lemonsqueezy_variant_id: string
  discord_role_id: string
  feature_max_collaborators: number
  feature_usage_credits_per_month: number
  feature_max_guilds: number
  feature_max_commands: number
  feature_max_variables: number
  feature_max_custom_tables: number
  feature_max_custom_events: number
  feature_max_messages: number
  feature_max_event_listeners: number
  feature_max_schedules: number
  feature_priority_support: boolean
  feature_custom_bot_status: boolean
  feature_ai_included: boolean
  feature_ai_credit_per_day: number
}

// ---- staff, audit, settings

export interface StaffMember {
  discord_id: string
  role: "admin" | "staff"
  added_by: string
  username: string | null
  created_at: string
}

export interface StaffList {
  system_owner: string
  staff: StaffMember[]
}

export interface AuditEntry {
  id: number
  actor_discord_id: string
  action: string
  target: string
  detail: unknown
  created_at: string
}

export interface SettingsGroup {
  values: Record<string, unknown>
  secrets_set: Record<string, boolean>
  restart_required: boolean
}

export type SettingsGroups = Record<string, SettingsGroup>

export interface AIModel {
  key: string
  name: string
  model: string
  credits: number
}

export interface AIProviderView {
  id: string
  api: "openai" | "anthropic"
  base_url: string
  api_key_set?: boolean
  models: AIModel[]
}
