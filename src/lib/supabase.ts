import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: only create the real client when both env vars are present.
// Without them the app renders normally — auth features are simply no-ops.
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key-not-configured",
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ─── Order type matching the Supabase `orders` table ────────────────────────

export interface Order {
  id: string;
  user_id: string;
  user_email: string;
  items: {
    product_id: string;
    title: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  bundle_discount: number;
  delivery_fee: number;
  total: number;
  razorpay_payment_id: string;
  status: "paid" | "processing" | "shipped" | "delivered";
  created_at: string;
}

// ─── Fetch orders for a logged-in user ───────────────────────────────────────

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  if (!supabaseConfigured) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error.message);
    return [];
  }
  return (data as Order[]) ?? [];
}
