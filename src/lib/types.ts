// Shared API types for the standalone trainer-client backend.

export type ClientMode = 'paid' | 'trial' | 'illustrative';
export type SessionStatus =
  | 'scheduled'
  | 'completed'
  | 'canceled'
  | 'no_show'
  | 'approved'
  | 'rescheduling';
export type RequestStatus = 'pending' | 'approved' | 'declined';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'forgiven';
/** Feature 12: exactly these three payment channels. */
export type PaymentChannel = 'telebirr' | 'cbe' | 'others';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'forgiven';
export type MessageKind = 'text' | 'image' | 'voice';

export interface AccessState {
  state: 'allowed' | 'blocked_unpaid' | 'blocked_no_period';
  reason?: string;
  period_id?: number;
  invoice_id?: number;
}

export interface PaymentInstructions {
  telebirr_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  cash_note: string;
}

export interface InvoicePeriod {
  id: number;
  start_date: string;
  end_date: string;
}

export interface InvoiceInfo {
  id: number;
  amount: string;
  status: InvoiceStatus;
  due_date: string;
  period: InvoicePeriod | null;
}

export interface ActivePeriod {
  id: number;
  start_date: string;
  end_date: string;
  is_trial: boolean;
  amount: string;
  package_name: string | null;
}

export interface PaymentRequirement {
  /** Feature 10: false = client is not asked for money right now. */
  required: boolean;
  /** Decimal string when required, otherwise null. */
  amount: string | null;
  /** Which branch answered: trial | paid | period | instruction | no_instruction | illustrative */
  source: string;
  period_id: number | null;
  instruction_id: number | null;
  /** Days until the active period's / cycle's final day (0 = last day). */
  days_left: number | null;
  /** none | covered | upcoming | ask | grace | blocked */
  phase?: 'none' | 'covered' | 'upcoming' | 'ask' | 'grace' | 'blocked';
  /** paid | trial | discount | illustration | none */
  kind?: string;
  cycle_start?: string | null;
  cycle_end?: string | null;
  /** The day the money is due, the day the request opens, and the last day the
   *  app stays open before an unpaid client is blocked. */
  due_on?: string | null;
  ask_opens_on?: string | null;
  /** First day an unpaid client is blocked; `grace_ends_on` is the day before. */
  blocked_from?: string | null;
  grace_ends_on?: string | null;
  next_due_on?: string | null;
  next_ask_opens_on?: string | null;
  /** A payment was submitted and is waiting for the trainer. */
  awaiting_approval?: boolean;
}

export interface BillingPayload {
  access: AccessState;
  invoice: InvoiceInfo | null;
  payment_requirement: PaymentRequirement;
  active_period: ActivePeriod | null;
  payment_instructions: PaymentInstructions;
  mode: ClientMode;
}

export interface ClientProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  mode: ClientMode;
  avatar_url: string;
  goals: string[];
  goal_label: string;
  medical_history: string;
  emergency_contact: string;
  current_weight: number | null;
  target_weight: number | null;
  body_fat: number | null;
  created_at: string;
  last_session_date: string | null;
  trainer_name: string;
  streak: Streak | null;
  measurements: Measurement[];
  photos: ProgressPhoto[];
  records: PersonalRecord[];
  achievements: Achievement[];
}

export interface Streak {
  current: number;
  longest: number;
  last_activity_date?: string | null;
}

export interface Achievement {
  id: number;
  key: string;
  label: string;
  unlocked_at: string;
}

export interface WorkoutExercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
  target_weight: number;
  rest_seconds: number;
  video_url: string;
  description: string;
  muscle_group: string;
}

export interface WorkoutDay {
  id: number;
  day_name: string;
  order: number;
  is_today?: boolean;
  exercises: WorkoutExercise[];
}

export interface TodayData {
  today_workout: WorkoutDay | null;
  other_days: WorkoutDay[];
  diet: {
    macros: {
      daily_calories: number;
      protein: number;
      carbs: number;
      fats: number;
      name: string;
    } | null;
    meals: {
      name: string;
      time: string;
      items: { name: string; calories: number; protein: number; carbs: number; fats: number }[];
    }[];
  } | null;
  next_session: Session | null;
  upcoming_sessions: Session[];
  today_sessions: Session[];
  water: { id: number; date: string; amount_ml: number; trainer_feedback: string; reviewed: boolean } | null;
  /** What the client actually logged in the food diary today. */
  diary: {
    calories: number;
    entries: { id: number; meal_name: string; calories: number | null; status: 'pending' | 'reviewed' }[];
  };
  /** Body snapshot: start / current / target weight and a short trend. */
  progress: {
    start_weight: number | null;
    current_weight: number | null;
    target_weight: number | null;
    body_fat: number | null;
    last_measured: string | null;
    trend: number[];
  };
  /** Sessions attended vs total finished in the last 30 days. */
  attendance: { attended: number; total: number };
  recent_achievements: Achievement[];
  counts: { workout_plans: number; diet_plans: number };
  billing: BillingPayload;
  streak: Streak;
}

export interface MealItem {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  order: number;
}

export interface Meal {
  id: number;
  name: string;
  time: string;
  order: number;
  items: MealItem[];
}

export interface DietPlan {
  id: number;
  name: string;
  client: number | null;
  client_name: string | null;
  daily_calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: Meal[];
  is_template: boolean;
  created_at: string;
}

export interface PlannedExerciseDetail {
  id: number;
  exercise: number;
  exercise_detail: {
    id: number;
    name: string;
    muscle_group: string;
    difficulty: string;
    equipment: string;
    description: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    video_url: string;
    trainer: number | null;
  };
  sets: number;
  reps: string;
  target_weight: number;
  rest_seconds: number;
  order: number;
}

export interface ClientWorkoutDay {
  id: number;
  day_name: string;
  order: number;
  exercises: PlannedExerciseDetail[];
}

export interface WorkoutPlan {
  id: number;
  name: string;
  client: number | null;
  client_name: string | null;
  days: ClientWorkoutDay[];
  is_template: boolean;
  created_at: string;
}

/** A plan the trainer attached to a session (offline sessions only). */
export interface AttachedPlan {
  id: number;
  name: string;
}

export interface Session {
  id: number;
  date: string;
  time: string;
  end_date: string | null;
  end_time: string | null;
  duration_minutes: number;
  status: SessionStatus;
  is_online: boolean;
  notes: string;
  is_today: boolean;
  recommended_workouts: AttachedPlan[];
  recommended_diets: AttachedPlan[];
}

export interface RescheduleRequest {
  id: number;
  session: number | null;
  session_info: { id: number; date: string; time: string; duration_minutes: number } | null;
  client: number;
  client_name: string;
  requested_date: string;
  requested_time: string | null;
  reason: string;
  status: RequestStatus;
  trainer_note: string;
  created_at: string;
  decided_at: string | null;
}

export interface PermissionRequest {
  id: number;
  session: number | null;
  client: number;
  client_name: string;
  date: string;
  kind: 'late' | 'absent';
  reason: string;
  status: RequestStatus;
  trainer_note: string;
  created_at: string;
  decided_at: string | null;
}

export interface Payment {
  id: number;
  invoice: number;
  invoice_info: { id: number; amount: string; due_date: string; status: string };
  client: number;
  client_name: string;
  transaction_id: string;
  channel: PaymentChannel;
  status: PaymentStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string;
}

export interface Invoice {
  id: number;
  client: number;
  client_name: string;
  period: number | null;
  period_info: { id: number; start_date: string; end_date: string; is_trial: boolean } | null;
  amount: string;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  paid_at: string | null;
  payments: Payment[];
}

export interface Message {
  id: number;
  sender_type: 'trainer' | 'client';
  client: number;
  content: string;
  kind: MessageKind;
  media_urls: string[];
  is_broadcast: boolean;
  broadcast_id: string;
  trainer_read_at: string | null;
  client_read_at: string | null;
  created_at: string;
}

export interface FoodDiaryEntry {
  id: number;
  date: string;
  meal_name: string;
  description: string;
  calories: number | null;
  photo_url: string;
  /** Feature 29: actually used vs intended to use. */
  intent?: 'actual' | 'intended';
  status: 'pending' | 'reviewed';
  trainer_feedback: string;
  created_at: string;
}

export interface WaterLog {
  id: number;
  date: string;
  amount_ml: number;
  trainer_feedback: string;
  reviewed: boolean;
}

export interface Measurement {
  id: number;
  date: string;
  weight: number | null;
  body_fat: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
}

export interface ProgressPhoto {
  id: number;
  url: string;
  date: string;
  note: string;
  created_at: string;
}

export interface PersonalRecord {
  id: number;
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'message' | 'alert' | 'achievement' | 'request';
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface LoginResponse {
  blocked: boolean;
  must_change_credential?: boolean;
  client?: { id: number; name: string; phone: string; email: string; mode: ClientMode; avatar_url: string };
  access?: string;
  refresh?: string;
  reason?: string;
  billing?: BillingPayload;
}
