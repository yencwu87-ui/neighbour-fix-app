export type Role = 'customer' | 'pro' | 'admin';

export type Profile = { id: string; role: Role; name: string | null; phone: string | null };

export type PriceRange = { job: string; low: number; high: number };

export type Pro = {
  id: string;
  user_id: string | null;
  name: string;
  kind: 'repair' | 'design' | 'supplier';
  trade: string;
  trades: string[];
  areas: string[];
  licence_type: string | null;
  licence_checked: string | null;
  materials_policy: string | null;
  price_ranges: PriceRange[];
  note: string | null;
  origin: string | null;
  delivers: boolean | null;
  active?: boolean;
  available?: boolean;
  example: boolean;
};

export type LabourLine = { desc: string; amount: number };
export type MaterialLine = { item: string; spec: string; qty: number; unit: number; receipt: boolean };
export type FeeLine = { key: string; label: string; amount: number };
export type Quote = {
  callout: number;
  labour: LabourLine[];
  materials: MaterialLine[];
  fees: FeeLine[];
  markup: string;
  commission_pct?: number;
};

export type Status = 'new' | 'matched' | 'quoted' | 'done' | 'cancelled';

export type JobRequest = {
  id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  area: string;
  category: string;
  job_id: string | null;
  job_name: string | null;
  urgency: string;
  description: string;
  budget: number | null;
  own_materials: boolean;
  scope: unknown;
  estimate: { low: number; high: number } | null;
  status: Status;
  pro_id: string | null;
  quote: Quote | null;
  rating: number | null;
  review: string | null;
  example: boolean;
  created_at: string;
};

export type Application = {
  id: string;
  user_id: string;
  name: string;
  trade: string;
  areas: string[];
  phone: string;
  licence_type: string | null;
  licence_no: string | null;
  years: number | null;
  reviews: string | null;
  prices_text: string | null;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
};

export type Rate = { job_id: string; low: number; high: number; example: boolean };

export type Settings = {
  commission_pct: number;
  customer_fee: number | null;
  customer_fee_label: string | null;
  customer_fee_on: boolean;
  emergency_fee: number | null;
  plan_price: number | null;
  plan_includes: string[];
  reno_fee: string | null;
  example: boolean;
};
