import {
  useState,
  useReducer,
  useContext,
  createContext,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  ShoppingBag,
  X,
  Menu,
  ArrowRight,
  Plus,
  Minus,
  ChevronRight,
  Send,
  MapPin,
  Phone,
  Mail,
  Tag,
  Check,
  CreditCard,
  Smartphone,
  Wallet,
  User,
  LogOut,
  ChevronDown,
  Calendar,
  Package,
} from "lucide-react";

// ─── Supabase — single shared client (no duplicate instances) ────────────────
import { supabase, supabaseConfigured } from "../lib/supabase";

// ─── Razorpay global TypeScript declarations ──────────────────────────────

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  modal?: { backdropclose?: boolean; escape?: boolean };
}

interface RazorpayInstance {
  open(): void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface ImportMetaEnv {
  readonly VITE_RAZORPAY_KEY_ID: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ─── Types ────────────────────────────────────────────────────────────────

interface ProductNotes {
  top: string[];
  heart: string[];
  base: string[];
}

interface Product {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  mrpPrice: number;
  salePrice: number;
  description: string;
  main_image_url: string;
  secondary_image_url: string;
  gallery: string[];
  concentration: number;
  notes: ProductNotes;
  volume: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type CartAction =
  | { type: "ADD_ITEM"; product: Product }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QTY"; id: string; delta: number }
  | { type: "CLEAR" };

interface CartState {
  items: CartItem[];
}

type Page = "home" | "product" | "about" | "contact" | "auth" | "account";

interface NavigateFn {
  (page: Page, productId?: string): void;
}

// ─── Order type (mirrors Supabase `orders` table) ────────────────────────────

interface OrderItem {
  product_id: string;
  title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  user_id: string;
  user_email: string;
  items: OrderItem[];
  subtotal: number;
  bundle_discount: number;
  delivery_fee: number;
  total: number;
  razorpay_payment_id: string;
  status: "paid" | "processing" | "shipped" | "delivered";
  created_at: string;
}

async function fetchUserOrders(userId: string): Promise<Order[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchUserOrders:", error.message); return []; }
  return (data as Order[]) ?? [];
}

// ─── Auth types ───────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  method: "google";
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  orders: [],
  setOrders: () => {},
});

function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

// ─── UPDATED FIXED PRICING CORE CONSTANTS ────────────────────────────────────
const BUNDLE_PRICE = 1199; // 💡 FIXED: Updated from 999 to 1199
const SALE_PRICE = 799;
const DELIVERY_FEE = 70;

interface BundlePricing {
  lineSubtotal: number;
  bundlePairs: number;
  bundleDiscount: number;
  grandTotal: number;
  totalQty: number;
  youSave: number;
}

function computeBundlePricing(items: CartItem[]): BundlePricing {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const lineSubtotal = items.reduce(
    (s, i) => s + i.product.salePrice * i.quantity,
    0
  );
  const bundlePairs = Math.floor(totalQty / 2);
  const singles = totalQty % 2;
  const grandTotal = bundlePairs * BUNDLE_PRICE + singles * SALE_PRICE;
  const bundleDiscount = bundlePairs > 0 ? lineSubtotal - grandTotal : 0;
  const mrpTotal = items.reduce(
    (s, i) => s + i.product.mrpPrice * i.quantity,
    0
  );
  const youSave = mrpTotal - grandTotal;
  return {
    lineSubtotal,
    bundlePairs,
    bundleDiscount,
    grandTotal,
    totalQty,
    youSave,
  };
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "ocean-rush",
    title: "Ocean Rush",
    tagline: "Tides of Confidence",
    mrpPrice: 1199,
    salePrice: 799,
    description:
      "A crisp, electric fusion of Bergamot, Lavender, and Cedarwood. Ocean Rush is a high-persistence apparel perfume designed to bond with fabric fibers for a powerful, sophisticated aura that lasts. Fresh and commanding.",
    main_image_url: "https://i.postimg.cc/5y5wKm3G/OCEAN-RUSH-s.jpg",
    secondary_image_url: "https://i.postimg.cc/RhHNg17M/aura-element-ocean-rush-perfume-model-lifestyle-jpg-png.jpg",
    gallery: [
      "https://i.postimg.cc/5y5wKm3G/OCEAN-RUSH-s.jpg",
      "https://i.postimg.cc/kGbBTNQg/aura-element-ocean-rush-scent-script-story-jpg.jpg",
      "https://i.postimg.cc/Wzkh5mG4/aura-element-ocean-rush-fragrance-profile-notes-jpg.jpg",
      "https://i.postimg.cc/VvCdK9q6/aura-element-ocean-rush-perfume-ingredients-breakdown-jpg.jpg",
      "https://i.postimg.cc/RhHNg17M/aura-element-ocean-rush-perfume-model-lifestyle-jpg-png.jpg",
    ],
    concentration: 25,
    notes: {
      top: ["Lavender", "Bergamot", "Pink Pepper"],
      heart: ["Violet Leaf", "Water Lily", "Jasmine"],
      base: ["Musk", "Cedar", "Moss"],
    },
    volume: "50ml",
  },
  {
    id: "2",
    slug: "primal-storm",
    title: "Primal Storm",
    tagline: "Raw. Unfiltered. Unafraid.",
    mrpPrice: 1199,
    salePrice: 799,
    description:
      "An intense, aromatic woody fusion with a fresh spicy bite. A bold apparel perfume engineered for maximum sillage and raw energy on fabric.",
    main_image_url: "https://i.postimg.cc/G2BPG5p0/aura-element-primal-storm-luxury-fragrance-bottle-jpg.jpg",
    secondary_image_url: "https://i.postimg.cc/wB4ctp9q/aura-element-primal-storm-perfume-model-lifestyle-jpg-png.jpg",
    gallery: [
      "https://i.postimg.cc/G2BPG5p0/aura-element-primal-storm-luxury-fragrance-bottle-jpg.jpg",
      "https://i.postimg.cc/W3DmgH4j/aura-element-primal-storm-scent-script-story-jpg.jpg",
      "https://i.postimg.cc/5tKqHVf2/aura-element-primal-storm-fragrance-profile-notes-jpg.jpg",
      "https://i.postimg.cc/SK17XhmN/aura-element-primal-storm-perfume-ingredients-breakdown-jpg.jpg",
      "https://i.postimg.cc/wB4ctp9q/aura-element-primal-storm-perfume-model-lifestyle-jpg-png.jpg",
    ],
    concentration: 25,
    notes: {
      top: ["Italian Bergamot ", "Pink Perpper", "Lavender"],
      heart: ["Vetiver Haiti", "Geranium Egypt", "Sichuan Pepper"],
      base: ["Patchouli", "Cedarwood", "Madagascar"],
    },
    volume: "50ml",
  },
  {
    id: "3",
    slug: "velvet-blossom",
    title: "Velvet Blossom",
    tagline: "Softness is Strength",
    mrpPrice: 1199,
    salePrice: 799,
    description:
      "An elegant, sweet embrace of Pear Blossom, Red Berries, and Italian Mandarin. Velvet Blossom is a high-persistence apparel perfume that leaves a sophisticated, soft, and undeniable trail.",
    main_image_url: "https://i.postimg.cc/vHvngsvJ/aura-element-velvet-blossom-perfume-for-clothing-bottle-jpg.jpg",
    secondary_image_url: "https://i.postimg.cc/ZKLNBSct/aura-element-velvet-blossom-perfume-model-lifestyle-jpg-png.jpg",
    gallery: [
      "https://i.postimg.cc/vHvngsvJ/aura-element-velvet-blossom-perfume-for-clothing-bottle-jpg.jpg",
      "https://i.postimg.cc/L861jbCK/aura-element-velvet-blossom-scent-script-story-jpg.jpg",
      "https://i.postimg.cc/RVTt6BTj/aura-element-velvet-blossom-fragrance-profile-notes-jpg.jpg",
      "https://i.postimg.cc/rF940k97/aura-element-velvet-blossom-perfume-ingredients-breakdown-jpg.jpg",
      "https://i.postimg.cc/ZKLNBSct/aura-element-velvet-blossom-perfume-model-lifestyle-jpg-png.jpg",
    ],
    concentration: 25,
    notes: {
      top: ["Pear Blossom", "Red Berries", "Italian Mandarin"],
      heart: ["White Gardenia", "Jasmine Absolute", "Frangipani"],
      base: ["Brown Sugar", "Patchouli", "Musk"],
    },
    volume: "50ml",
  },
  {
    id: "4",
    slug: "rio-glow",
    title: "Rio Glow",
    tagline: "Golden Hour, Bottled",
    mrpPrice: 1199,
    salePrice: 799,
    description:
      "A vibrant, tropical escape featuring Passionfruit, Pineapple, and Vanilla Orchid. Rio Glow is an exotic unisex apparel perfume that captures the warmth of a summer sunset. Fresh, fruity, and undeniably radiant.",
    main_image_url: "https://i.postimg.cc/W12MX34f/aura-element-rio-glow-long-lasting-perfume-bottle-jpg.jpg",
    secondary_image_url: "https://i.postimg.cc/nhHv0zLW/aura-element-rio-glow-perfume-model-lifestyle-jpg-png.jpg",
    gallery: [
      "https://i.postimg.cc/W12MX34f/aura-element-rio-glow-long-lasting-perfume-bottle-jpg.jpg",
      "https://i.postimg.cc/t4Xh2TTb/aura-element-rio-glow-scent-script-story-jpg.jpg",
      "https://i.postimg.cc/sgVpwX2N/aura-element-rio-glow-fragrance-profile-notes-jpg.jpg",
      "https://i.postimg.cc/0y8pcQNF/aura-element-rio-glow-perfume-ingredients-breakdown-jpg.jpg",
      "https://i.postimg.cc/nhHv0zLW/aura-element-rio-glow-perfume-model-lifestyle-jpg-png.jpg",
    ],
    concentration: 25,
    notes: {
      top: ["Passionfruit", "Grapefruit", "Pineapple"],
      heart: ["Peony", "Vanilla Orchid", "Jasmine"],
      base: ["Musk", "Woody", "Oakmoss"],
    },
    volume: "50ml",
  },
];

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) => i.product.id === action.product.id
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { product: action.product, quantity: 1 }],
      };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.product.id !== action.id) };
    case "UPDATE_QTY":
      return {
        items: state.items
          .map((i) =>
            i.product.id === action.id
              ? { ...i, quantity: i.quantity + action.delta }
              : i
          )
          .filter((i) => i.quantity > 0),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

type PayStep = "select" | "processing" | "success";
type PayMethod = "upi" | "card" | "wallet";

function MockCheckoutModal({
  isOpen,
  grandTotal,
  items,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  grandTotal: number;
  items: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<PayStep>("select");
  const [method, setMethod] = useState<PayMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [orderId] = useState(
    () => "AE" + Math.random().toString(36).slice(2, 10).toUpperCase()
  );

  const resetAndClose = () => {
    setStep("select");
    setUpiId("");
    setCardNum("");
    setCardExp("");
    setCardCvv("");
    onClose();
  };

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
    }, 2200);
  };

  const handleDone = () => {
    onSuccess();
    resetAndClose();
  };

  const isPayEnabled =
    method === "upi"
      ? upiId.includes("@") && upiId.length > 4
      : method === "card"
      ? cardNum.replace(/\s/g, "").length === 16 &&
        cardExp.length === 5 &&
        cardCvv.length >= 3
      : true;

  const formatCard = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="rzp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            onClick={step === "success" ? handleDone : resetAndClose}
          />

          <motion.div
            key="rzp-modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed z-[70] inset-x-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 w-full sm:w-[420px] bg-white shadow-2xl overflow-hidden"
          >
            <div className="bg-[#111111] px-6 py-4 flex items-center justify-between">
              <div>
                <p
                  style={{ fontFamily: "var(--font-display)" }}
                  className="text-white text-lg tracking-widest uppercase"
                >
                  Aura Element
                </p>
                <p
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-[#e6c79c] text-xs tracking-[0.15em] mt-0.5"
                >
                  Secure Checkout
                </p>
              </div>
              <div className="text-right">
                <p
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-[#7a6e5f] text-[10px] tracking-[0.1em] uppercase"
                >
                  Total
                </p>
                <p
                  style={{ fontFamily: "var(--font-display)" }}
                  className="text-white text-2xl"
                >
                  ₹{grandTotal.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === "select" && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#7a6e5f] mb-4"
                  >
                    Select Payment Method
                  </p>

                  <div className="flex gap-2 mb-6">
                    {(
                      [
                        {
                          key: "upi",
                          label: "UPI",
                          icon: <Smartphone size={14} />,
                        },
                        {
                          key: "card",
                          label: "Card",
                          icon: <CreditCard size={14} />,
                        },
                        {
                          key: "wallet",
                          label: "Wallets",
                          icon: <Wallet size={14} />,
                        },
                      ] as { key: PayMethod; label: string; icon: React.ReactNode }[]
                    ).map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => setMethod(key)}
                        style={{ fontFamily: "var(--font-body)" }}
                        className={`flex-1 flex flex-col items-center gap-1.5 py-3 text-xs tracking-[0.1em] border transition-all duration-200 ${
                          method === key
                            ? "border-[#e6c79c] bg-[#f5f0e8] text-[#111111]"
                            : "border-[#111111]/15 text-[#7a6e5f] hover:border-[#e6c79c]/50"
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>

                  {method === "upi" && (
                    <div className="mb-6">
                      <label
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[10px] tracking-[0.15em] uppercase text-[#7a6e5f] block mb-2"
                      >
                        UPI ID
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@upi"
                        style={{ fontFamily: "var(--font-body)" }}
                        className="w-full border-b border-[#111111]/20 focus:border-[#e6c79c] py-2.5 text-sm text-[#111111] placeholder-[#7a6e5f]/50 bg-transparent outline-none transition-colors"
                      />
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[10px] text-[#7a6e5f] mt-2"
                      >
                        Supports PhonePe · GPay · Paytm · BHIM
                      </p>
                    </div>
                  )}

                  {method === "card" && (
                    <div className="mb-6 space-y-4">
                      <div>
                        <label
                          style={{ fontFamily: "var(--font-body)" }}
                          className="text-[10px] tracking-[0.15em] uppercase text-[#7a6e5f] block mb-2"
                        >
                          Card Number
                        </label>
                        <input
                          type="text"
                          value={cardNum}
                          onChange={(e) =>
                            setCardNum(formatCard(e.target.value))
                          }
                          placeholder="0000 0000 0000 0000"
                          style={{ fontFamily: "var(--font-body)" }}
                          className="w-full border-b border-[#111111]/20 focus:border-[#e6c79c] py-2.5 text-sm text-[#111111] placeholder-[#7a6e5f]/50 bg-transparent outline-none transition-colors"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label
                            style={{ fontFamily: "var(--font-body)" }}
                            className="text-[10px] tracking-[0.15em] uppercase text-[#7a6e5f] block mb-2"
                          >
                            Expiry
                          </label>
                          <input
                            type="text"
                            value={cardExp}
                            onChange={(e) =>
                              setCardExp(formatExp(e.target.value))
                            }
                            placeholder="MM/YY"
                            style={{ fontFamily: "var(--font-body)" }}
                            className="w-full border-b border-[#111111]/20 focus:border-[#e6c79c] py-2.5 text-sm text-[#111111] placeholder-[#7a6e5f]/50 bg-transparent outline-none transition-colors"
                          />
                        </div>
                        <div className="flex-1">
                          <label
                            style={{ fontFamily: "var(--font-body)" }}
                            className="text-[10px] tracking-[0.15em] uppercase text-[#7a6e5f] block mb-2"
                          >
                            CVV
                          </label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) =>
                              setCardCvv(
                                e.target.value.replace(/\D/g, "").slice(0, 4)
                              )
                            }
                            placeholder="•••"
                            style={{ fontFamily: "var(--font-body)" }}
                            className="w-full border-b border-[#111111]/20 focus:border-[#e6c79c] py-2.5 text-sm text-[#111111] placeholder-[#7a6e5f]/50 bg-transparent outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {method === "wallet" && (
                    <div className="mb-6 grid grid-cols-3 gap-2">
                      {["Paytm", "PhonePe", "Amazon Pay", "Mobikwik", "Freecharge", "Airtel"].map(
                        (w) => (
                          <button
                            key={w}
                            style={{ fontFamily: "var(--font-body)" }}
                            className="border border-[#111111]/10 py-3 text-[11px] text-[#7a6e5f] hover:border-[#e6c79c] hover:text-[#111111] transition-all duration-200"
                          >
                            {w}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  <button
                    onClick={handlePay}
                    disabled={!isPayEnabled}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="w-full bg-[#111111] text-white py-4 text-sm tracking-[0.2em] uppercase font-medium hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Pay ₹{grandTotal.toLocaleString("en-IN")}
                  </button>

                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-center text-[10px] text-[#7a6e5f] mt-3 tracking-[0.08em]"
                  >
                    🔒 Phase 1 — Mock Checkout. Add Razorpay key to go live.
                  </p>
                </motion.div>
              )}

              {step === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-16 flex flex-col items-center gap-5"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-10 h-10 border-2 border-[#e6c79c] border-t-transparent rounded-full"
                  />
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-sm tracking-[0.15em] text-[#7a6e5f]"
                  >
                    Processing your payment…
                  </p>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 py-10 flex flex-col items-center text-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 18, stiffness: 280 }}
                    className="w-16 h-16 bg-[#111111] flex items-center justify-center"
                  >
                    <Check size={28} className="text-[#e6c79c]" strokeWidth={2} />
                  </motion.div>
                  <div>
                    <h3
                      style={{ fontFamily: "var(--font-display)" }}
                      className="text-[#111111] text-2xl"
                    >
                      Order Confirmed
                    </h3>
                    <p
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-[#7a6e5f] text-xs tracking-[0.15em] mt-1"
                    >
                      Order ID: {orderId}
                    </p>
                  </div>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[#7a6e5f] text-sm font-light leading-relaxed max-w-xs"
                  >
                    Thank you for choosing Aura Element. Your fragrance will be
                    dispatched within 24–48 hours.
                  </p>
                  {items.map((item) => (
                    <p
                      key={item.product.id}
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-[#111111] text-xs tracking-[0.1em]"
                    >
                      {item.product.title} ({item.product.volume}) ×{" "}
                      {item.quantity}
                    </p>
                  ))}
                  <button
                    onClick={handleDone}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="mt-2 w-full bg-[#e6c79c] text-[#111111] py-3.5 text-xs tracking-[0.25em] uppercase font-semibold hover:bg-[#111111] hover:text-white transition-all duration-300"
                  >
                    Continue Shopping
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Announcement Bar ─────────────────────────────────────────────────────

// 💡 FIXED: Updated text parameters to ₹1,199 framework baseline
const MARQUEE_TEXT =
  "BUY ANY 2 FOR ONLY ₹1,199  ·  25% OIL CONCENTRATION SIGNATURE  ·  FREE SHIPPING ABOVE ₹1,199  ·  HANDCRAFTED PARFUM GRADE  ·  ";

function AnnouncementBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-8 sm:h-9 bg-black flex items-center overflow-hidden select-none">
      <motion.div
        animate={{ x: "-50%" }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        className="flex shrink-0 whitespace-nowrap"
      >
        {[0, 1].map((copy) => (
          <span
            key={copy}
            style={{ fontFamily: "var(--font-body)" }}
            className="inline-flex items-center text-white text-[9px] sm:text-[10px] tracking-[0.32em] uppercase shrink-0"
          >
            {MARQUEE_TEXT}
            {MARQUEE_TEXT}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────

function Navbar({
  navigate,
  currentPage,
}: {
  navigate: NavigateFn;
  currentPage: Page;
}) {
  const { state, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNav = (page: Page) => {
    navigate(page);
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const links: { label: string; page: Page }[] = [
    { label: "Shop", page: "home" },
    { label: "Our Story", page: "about" },
    { label: "Contact", page: "contact" },
  ];

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-30 transition-all duration-500 ${
          scrolled
            ? "bg-white/96 backdrop-blur-md border-b border-[#e6c79c]/40"
            : "bg-transparent"
        }`}
        style={{ top: "32px" }}
      >
        <div className="flex items-center justify-between px-5 sm:px-8 lg:px-14 h-16 sm:h-20">
          <button
            onClick={() => handleNav("home")}
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-xl sm:text-2xl tracking-widest uppercase select-none"
          >
            Aura Element
          </button>

          <nav className="hidden md:flex items-center gap-10">
            {links.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => handleNav(page)}
                style={{ fontFamily: "var(--font-body)" }}
                className={`text-sm tracking-[0.15em] uppercase transition-colors duration-200 ${
                  currentPage === page
                    ? "text-[#e6c79c]"
                    : "text-[#111111] hover:text-[#e6c79c]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative text-[#111111] hover:text-[#e6c79c] transition-colors duration-200 p-1"
              aria-label="Open cart"
            >
              <ShoppingBag size={22} strokeWidth={1.5} />
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-[#e6c79c] text-[#111111] text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center leading-none"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>

            {/* ─── Profile Menu State Pipeline ─── */}
            {user ? (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 hover:text-[#e6c79c] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e6c79c]/50">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className={`text-[#111111]/50 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-full mt-3 w-56 bg-white border border-[#111111]/10 shadow-xl z-50"
                    >
                      <div className="px-4 py-3 border-b border-[#111111]/8">
                        <p style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-base truncate">
                          {user.name}
                        </p>
                        <p style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f] text-xs truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNav("account")}
                        style={{ fontFamily: "var(--font-body)" }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#7a6e5f] hover:text-[#111111] hover:bg-[#f5f0e8] transition-colors"
                      >
                        <User size={14} strokeWidth={1.5} />
                        My Portal
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => handleNav("auth")}
                style={{ fontFamily: "var(--font-body)" }}
                className="hidden md:flex items-center gap-2 text-sm tracking-[0.12em] uppercase text-[#111111] hover:text-[#e6c79c] transition-colors"
              >
                <User size={17} strokeWidth={1.5} />
                Sign In
              </button>
            )}

            <button
              className="md:hidden text-[#111111] hover:text-[#e6c79c] transition-colors p-1"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X size={22} strokeWidth={1.5} />
              ) : (
                <Menu size={22} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-20 md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="menu-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 h-full w-4/5 max-w-xs bg-white z-30 md:hidden flex flex-col pt-8 px-8"
              style={{ top: 0 }}
            >
              <div className="pt-14 sm:pt-16">
                <div
                  className="absolute top-0 left-0 right-0"
                  style={{ height: "32px", background: "#000" }}
                />
                {links.map(({ label, page }, i) => (
                  <motion.button
                    key={page}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.25 }}
                    onClick={() => handleNav(page)}
                    style={{ fontFamily: "var(--font-display)" }}
                    className={`text-left text-2xl py-5 border-b border-[#111111]/10 w-full ${
                      currentPage === page ? "text-[#e6c79c]" : "text-[#111111]"
                    }`}
                  >
                    {label}
                  </motion.button>
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 p-4 bg-[#111111]"
                >
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[#e6c79c] text-xs tracking-[0.2em] uppercase"
                  >
                    🎁 Bundle Offer
                  </p>
                  <p
                    style={{ fontFamily: "var(--font-display)" }}
                    className="text-white text-xl mt-1"
                  >
                    Any 2 for ₹1,199
                  </p>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[#7a6e5f] text-xs mt-1"
                  >
                    Mix & match all four fragrances
                  </p>
                </motion.div>

                {user ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 flex items-center gap-3 border-t border-[#111111]/10 pt-6"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-[#e6c79c]/50 shrink-0">
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-base truncate">
                        {user.name}
                      </p>
                      <button
                        onClick={() => handleNav("account")}
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-xs text-[#7a6e5f] tracking-[0.1em] flex items-center gap-1 mt-0.5"
                      >
                        <User size={11} /> My Portal
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => handleNav("auth")}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="mt-6 w-full border border-[#111111] text-[#111111] py-3.5 text-xs tracking-[0.25em] uppercase flex items-center justify-center gap-2"
                  >
                    <User size={15} strokeWidth={1.5} />
                    Sign In / Register
                  </motion.button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Cart Drawer (With Native Address Checkout Form) ──────────────────────

function CartDrawer() {
  const { state, dispatch, isCartOpen, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const [razorpayReady, setRazorpayReady] = useState(false);
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });

  const pricing = computeBundlePricing(state.items);
  const hasItems = state.items.length > 0;
  const finalTotal = pricing.grandTotal + (hasItems ? DELIVERY_FEE : 0);

  useEffect(() => {
    if (document.getElementById("razorpay-sdk")) {
      setRazorpayReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => console.error("Razorpay SDK failed to load.");
    document.body.appendChild(script);
  }, []);

  // 💡 Listen for the "Buy Now" custom view event trigger
  useEffect(() => {
    const handleBuyNowTrigger = () => {
      setShowAddressForm(true);
    };
    window.addEventListener("trigger-buy-now", handleBuyNowTrigger);
    return () => window.removeEventListener("trigger-buy-now", handleBuyNowTrigger);
  }, []);

  useEffect(() => {
    if (!isCartOpen) {
      setShowAddressForm(false);
    }
  }, [isCartOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!window.Razorpay) {
      alert("Payment gateway is still loading. Please try again in a moment.");
      return;
    }

    const fullAddressString = `${shippingDetails.addressLine1}, ${
      shippingDetails.addressLine2 ? shippingDetails.addressLine2 + ", " : ""
    }${shippingDetails.city}, ${shippingDetails.state} - ${shippingDetails.pincode}`;

    const parsedItems = state.items.map((i) => ({
      product_id: i.product.id,
      title: i.product.title,
      quantity: i.quantity,
      price: i.product.salePrice,
    }));

    const itemsSummaryString = state.items
      .map((i) => `${i.product.title} × ${i.quantity}`)
      .join(", ");

    const options: RazorpayOptions = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: finalTotal * 100,
      currency: "INR",
      name: "Aura Element",
      description: itemsSummaryString,
      image: "/favicon.png",
      handler: async (response: RazorpaySuccessResponse) => {
        // 💡 Save structured logging properties to Supabase database table
        try {
          if (supabaseConfigured) {
            await supabase.from("orders").insert({
              user_id: user?.id || null,
              user_email: user?.email || "",
              items: parsedItems,
              subtotal: pricing.lineSubtotal,
              bundle_discount: pricing.bundleDiscount,
              delivery_fee: DELIVERY_FEE,
              total: finalTotal,
              razorpay_payment_id: response.razorpay_payment_id,
              status: "paid"
            });
          }
        } catch (dbErr) {
          console.error("Database logs save bypassed:", dbErr);
        }

        alert(`Payment successful!\nPayment ID: ${response.razorpay_payment_id}`);
        dispatch({ type: "CLEAR" });
        setIsCartOpen(false);
        setShowAddressForm(false);
      },
      prefill: { 
        name: shippingDetails.name,      
        contact: shippingDetails.phone,  
        email: user?.email || "" 
      },
      notes: {
        "Customer Name": shippingDetails.name,
        "Customer Phone": shippingDetails.phone,
        "Shipping Address": fullAddressString,
        items: itemsSummaryString,
        delivery: `₹${DELIVERY_FEE}`,
      },
      theme: { color: "#000000" },
      modal: { backdropclose: false, escape: true },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <>
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              key="cart-bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setIsCartOpen(false)}
            />

            <motion.div
              key="cart-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#111111]/10">
                <div>
                  <h2
                    style={{ fontFamily: "var(--font-display)" }}
                    className="text-xl text-[#111111]"
                  >
                    {showAddressForm ? "Shipping Address" : "Your Bag"}
                  </h2>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-xs tracking-[0.15em] uppercase text-[#7a6e5f] mt-0.5"
                  >
                    {showAddressForm 
                      ? "Enter dispatch details"
                      : state.items.length === 0
                      ? "Nothing added yet"
                      : `${pricing.totalQty} item${pricing.totalQty > 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-[#111111]/40 hover:text-[#111111] transition-colors p-1"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              {pricing.totalQty >= 2 && !showAddressForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="bg-[#111111] px-6 py-3 flex items-center gap-3"
                >
                  <Tag size={14} className="text-[#e6c79c] shrink-0" />
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-white text-xs tracking-[0.1em]"
                  >
                    <span className="text-[#e6c79c] font-medium">
                      Bundle applied!
                    </span>{" "}
                    {pricing.bundlePairs} pair{pricing.bundlePairs > 1 ? "s" : ""} @ ₹1,199 each
                    {pricing.totalQty % 2 === 1 && " + 1 @ ₹799"}
                  </p>
                </motion.div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {state.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="w-16 h-16 border border-[#e6c79c]/40 flex items-center justify-center">
                      <ShoppingBag
                        size={24}
                        strokeWidth={1}
                        className="text-[#e6c79c]"
                      />
                    </div>
                    <div>
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[#7a6e5f] text-sm"
                      >
                        Your bag is empty
                      </p>
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[#e6c79c] text-xs tracking-[0.1em] mt-1"
                      >
                        Add 2 fragrances → save ₹599
                      </p>
                    </div>
                  </div>
                ) : showAddressForm ? (
                  <form id="address-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Full Name *</label>
                      <input required type="text" name="name" value={shippingDetails.name} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Phone Number *</label>
                      <input required type="tel" name="phone" value={shippingDetails.phone} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" placeholder="10-digit mobile layout" />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Address Line 1 *</label>
                      <input required type="text" name="addressLine1" value={shippingDetails.addressLine1} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" placeholder="Flat No., Building, Street Name" />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Address Line 2 (Optional)</label>
                      <input type="text" name="addressLine2" value={shippingDetails.addressLine2} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" placeholder="Landmark, Locality" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">City *</label>
                        <input required type="text" name="city" value={shippingDetails.city} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">State *</label>
                        <input required type="text" name="state" value={shippingDetails.state} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Pincode *</label>
                      <input required type="text" name="pincode" value={shippingDetails.pincode} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-2 text-sm text-[#111111] outline-none transition-colors" />
                    </div>
                  </form>
                ) : (
                  <div>
                    {state.items.map((item, idx) => (
                      <div key={item.product.id} className={`flex gap-4 py-5 ${idx < state.items.length - 1 ? "border-b border-[#111111]/8" : ""}`}>
                        <div className="w-20 h-24 shrink-0 bg-[#f5f0e8] overflow-hidden"><img src={item.product.main_image_url} alt="" className="w-full h-full object-cover" /></div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <p style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-base leading-tight">{item.product.title}</p>
                            <p style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f] text-[11px] tracking-[0.1em] mt-0.5">{item.product.volume} · {item.product.concentration}% Parfum</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontFamily: "var(--font-body)" }} className="text-sm font-medium text-[#111111]">₹{item.product.salePrice.toLocaleString("en-IN")}</span>
                              <span style={{ fontFamily: "var(--font-body)" }} className="text-xs text-[#7a6e5f] line-through">₹{item.product.mrpPrice.toLocaleString("en-IN")}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-[#111111]/15">
                              <button onClick={() => dispatch({ type: "UPDATE_QTY", id: item.product.id, delta: -1 })} className="w-7 h-7 flex items-center justify-center text-[#111111]/50"><Minus size={12} /></button>
                              <span style={{ fontFamily: "var(--font-body)" }} className="w-7 text-center text-sm font-medium text-[#111111]">{item.quantity}</span>
                              <button onClick={() => dispatch({ type: "UPDATE_QTY", id: item.product.id, delta: 1 })} className="w-7 h-7 flex items-center justify-center text-[#111111]/50"><Plus size={12} /></button>
                            </div>
                            <button onClick={() => dispatch({ type: "REMOVE_ITEM", id: item.product.id })} className="text-[#111111]/25 hover:text-[#111111]"><X size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {state.items.length > 0 && (
                <div className="border-t border-[#111111]/10 px-6 pt-4 pb-7 flex flex-col gap-3">
                  <div className="flex justify-between text-sm"><span style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f] text-xs uppercase">Subtotal</span><span style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f] text-sm">₹{pricing.lineSubtotal.toLocaleString("en-IN")}</span></div>
                  {pricing.bundleDiscount > 0 && <div className="flex justify-between items-center"><span style={{ fontFamily: "var(--font-body)" }} className="text-xs text-[#e6c79c] flex items-center gap-1.5"><Tag size={11} /> Bundle Discount</span><span style={{ fontFamily: "var(--font-body)" }} className="text-[#e6c79c] font-medium text-sm">−₹{pricing.bundleDiscount.toLocaleString("en-IN")}</span></div>}
                  <div className="flex justify-between items-center"><span style={{ fontFamily: "var(--font-body)" }} className="text-xs text-[#7a6e5f]">Delivery Charges</span><span style={{ fontFamily: "var(--font-sm)" }} className="text-sm text-[#111111]">₹{DELIVERY_FEE}</span></div>
                  <div className="flex justify-between items-baseline border-t border-[#111111]/8 pt-3"><span style={{ fontFamily: "var(--font-body)" }} className="text-xs text-[#7a6e5f] uppercase">Total</span><span style={{ fontFamily: "var(--font-display)" }} className="text-2xl text-[#111111]">₹{finalTotal.toLocaleString("en-IN")}</span></div>

                  {!showAddressForm ? (
                    <button onClick={() => setShowAddressForm(true)} style={{ fontFamily: "var(--font-body)" }} className="w-full bg-[#111111] text-white py-4 text-xs uppercase tracking-widest flex items-center justify-center gap-2">Proceed to Checkout <ArrowRight size={15} /></button>
                  ) : (
                    <div className="flex gap-3 mt-1">
                      <button type="button" onClick={() => setShowAddressForm(false)} style={{ fontFamily: "var(--font-body)" }} className="w-1/3 border py-4 text-xs uppercase">Back</button>
                      <button type="submit" form="address-checkout-form" disabled={!razorpayReady} style={{ fontFamily: "var(--font-body)" }} className="w-2/3 bg-[#111111] text-white py-4 text-xs uppercase tracking-widest disabled:opacity-60">{razorpayReady ? "Authorize & Pay Now" : "Loading Gateway…"}</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────

function HeroSection({ navigate }: { navigate: NavigateFn }) {
  const { scrollY } = useScroll();
  const imgScale = useTransform(scrollY, [0, 700], [1, 1.12]);
  const imgY = useTransform(scrollY, [0, 700], ["0%", "10%"]);
  const textY = useTransform(scrollY, [0, 700], ["0%", "22%"]);
  const overlayOpacity = useTransform(scrollY, [0, 500], [0.4, 0.65]);
  const textOpacity = useTransform(scrollY, [0, 350], [1, 0]);

  return (
    <div className="relative overflow-hidden bg-[#0a0f1a]" style={{ height: "72vh", minHeight: 480 }}>
      <motion.div style={{ scale: imgScale, y: imgY }} className="absolute inset-0 origin-center"><img src="https://i.postimg.cc/SKmknBDz/Firefly-Gemini-Flash-(3).png" alt="" className="w-full h-full object-cover" /></motion.div>
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-[#111111]" />
      <motion.div style={{ y: textY, opacity: textOpacity }} className="absolute inset-0 flex flex-col justify-end px-6 sm:px-14 lg:px-20 pb-16 sm:pb-24">
        <div className="inline-flex items-center gap-3 mb-5"><div className="w-8 h-px bg-[#e6c79c]" /><span style={{ fontFamily: "var(--font-body)" }} className="text-[#e6c79c] text-[10px] tracking-[0.4em] uppercase">Launch Collection · 4 Signatures</span></div>
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[1.02] max-w-3xl mb-5 sm:mb-7">Wear Your<br />Story.</h1>
        <p style={{ fontFamily: "var(--font-body)" }} className="text-white/65 text-sm sm:text-base font-light mb-8 max-w-sm">25% oil concentration. Built to last 14 hours.<br />Any 2 bottles — only ₹1,199.</p>
        <div className="flex items-center gap-5 flex-wrap">
          <button onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })} style={{ fontFamily: "var(--font-body)" }} className="bg-[#e6c79c] text-[#111111] px-8 py-3.5 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">Shop the Edit <ArrowRight size={14} /></button>
          <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2"><Tag size={13} className="text-[#e6c79c]" /><span style={{ fontFamily: "var(--font-body)" }} className="text-white text-xs">Any 2 for ₹1,199</span></div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────

function ProductCard({ product, navigate, index }: { product: Product; navigate: NavigateFn; index: number }) {
  const { dispatch, setIsCartOpen } = useCart();
  const [hovered, setHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "ADD_ITEM", product });
    setIsCartOpen(true);
  };

  const discount = Math.round(((product.mrpPrice - product.salePrice) / product.mrpPrice) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.65, delay: index * 0.08 }} className="group flex flex-col cursor-pointer" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => navigate("product", product.id)}>
      <div className="relative overflow-hidden bg-[#f0ebe0]" style={{ aspectRatio: "3/4" }}>
        <img src={product.main_image_url} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${hovered ? "opacity-0" : "opacity-100"}`} />
        <img src={product.secondary_image_url} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${hovered ? "opacity-100" : "opacity-0"}`} />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5"><span className="bg-[#111111] text-white text-[9px] uppercase px-2 py-1">{discount}% OFF</span><span className="bg-[#e6c79c] text-[#111111] text-[9px] uppercase px-2 py-1 font-semibold">25% Parfum</span></div>
        <motion.div initial={false} animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }} className="absolute inset-x-0 bottom-0 p-4"><button onClick={handleAddToCart} style={{ fontFamily: "var(--font-body)" }} className="w-full bg-[#111111]/90 text-white text-xs uppercase py-3 tracking-widest">Add to Bag</button></motion.div>
      </div>
      <div className="pt-2.5 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div><h3 style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-base sm:text-lg truncate">{product.title}</h3><p className="text-[#7a6e5f] text-[10px] uppercase tracking-wider mt-0.5">{product.tagline}</p></div>
          <div className="text-right"><p className="text-[#111111] font-medium text-base">₹{product.salePrice.toLocaleString("en-IN")}</p><p className="text-[#7a6e5f] text-xs line-through">₹{product.mrpPrice.toLocaleString("en-IN")}</p></div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Bundle Callout Banner ────────────────────────────────────────────────

function BundleCallout() {
  return (
    <div className="mx-5 sm:mx-8 lg:mx-14 my-12 bg-[#111111] px-7 py-8 sm:py-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div>
        <p className="text-[#e6c79c] text-xs uppercase tracking-widest mb-2">🎁 Exclusive Launch Offer</p>
        <h3 style={{ fontFamily: "var(--font-display)" }} className="text-white text-3xl sm:text-4xl leading-tight">Any 2 Fragrances<br />for just ₹1,199</h3>
        <p className="text-[#7a6e5f] text-sm font-light mt-2">Save ₹599 · Mix &amp; match all four signatures · Automatic at checkout</p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {[
          { qty: 1, price: "₹799" },
          { qty: 2, price: "₹1,199", highlight: true },
          { qty: 3, price: "₹1,998" },
          { qty: 4, price: "₹2,398" },
        ].map(({ qty, price, highlight }) => (
          <div key={qty} className={`flex items-center justify-between gap-8 px-4 py-2 ${highlight ? "bg-[#e6c79c] text-[#111111]" : "border border-white/10 text-white"}`}>
            <span className="text-xs uppercase tracking-widest">{qty} bottle{qty > 1 ? "s" : ""}{highlight && " ★"}</span>
            <span style={{ fontFamily: "var(--font-display)" }} className="text-lg">{price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────

function HomePage({ navigate }: { navigate: NavigateFn }) {
  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HeroSection navigate={navigate} />
      <section id="collection" className="px-5 sm:px-8 lg:px-14 pt-20 pb-16">
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div><span className="text-[#e6c79c] text-xs tracking-widest uppercase block mb-2">Launch Collection</span><h2 style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-3xl sm:text-4xl lg:text-5xl">4 Signatures</h2></div>
          <p className="text-[#7a6e5f] text-sm font-light hidden sm:block">Each at ₹799. Add any 2 — pay ₹1,199.</p>
        </div>
        <div className="w-full h-px bg-[#111111]/10 mt-2 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRODUCTS.map((product, i) => (
            <ProductCard key={product.id} product={product} navigate={navigate} index={i} />
          ))}
        </div>
      </section>
      <BundleCallout />
      <BrandStrip />
      <PhilosophyTeaser navigate={navigate} />
      <Footer navigate={navigate} />
    </motion.div>
  );
}

// ─── Brand Strip ───────────────────────────────────────────────────────────

function BrandStrip() {
  const pillars = ["Any 2 for ₹1,199", "25% Oil Concentration", "Hand-Blended Formulas", "Cruelty Free", "Lasts 14–16 Hours", "Free Shipping ₹1,199+"];
  return (
    <div className="border-y border-[#e6c79c]/25 bg-[#fafaf8] overflow-hidden py-4 sm:py-5">
      <motion.div animate={{ x: "-50%" }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }} className="flex whitespace-nowrap shrink-0">
        {[0, 1].map((copy) => (
          <span key={copy} className="inline-flex items-center shrink-0">
            {[...pillars, ...pillars].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-6 sm:gap-10"><span style={{ fontFamily: "var(--font-body)" }} className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#7a6e5f]">{p}</span><span className="w-1 h-1 rounded-full bg-[#e6c79c]" /></span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Philosophy Teaser & Galleries ─────────────────────────────────────────

function PhilosophyTeaser({ navigate }: { navigate: NavigateFn }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
      <div className="flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-14 bg-[#f5f0e8]">
        <span className="text-[#e6c79c] text-xs uppercase tracking-widest block mb-5">Our Philosophy</span>
        <h2 style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-3xl sm:text-5xl leading-tight mb-5">Scent as<br />Second Skin</h2>
        <p className="text-[#7a6e5f] font-light text-sm sm:text-base mb-8 max-w-sm">Every Aura Element formula is built to interact with your skin, to become something uniquely yours. 25% oil concentration — the highest tier of luxury.</p>
        <button onClick={() => navigate("about")} style={{ fontFamily: "var(--font-body)" }} className="text-[#111111] text-xs tracking-widest uppercase flex items-center gap-3 font-medium group">Our Story <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></button>
      </div>
      <div className="overflow-hidden bg-[#e6c79c]/15"><img src="https://images.unsplash.com/photo-1779562909409-defc901cf57e?w=900&h=700&fit=crop" alt="" className="w-full h-full object-cover" /></div>
    </section>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function AuthPage({ navigate }: { navigate: NavigateFn }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setAuthError(error.message); setGoogleLoading(false); }
  };

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    setAuthError(null);
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setAuthError(error.message); } else { setEmailSent(true); }
    setEmailLoading(false);
  };

  return (
    <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#fafaf8]">
      <div className="relative hidden md:flex bg-[#111111] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1646032048835-b2a40ee0bede?w=900" alt="" className="absolute inset-0 w-full h-full object-cover opacity-55 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent/20" />
        <div className="relative z-10 flex flex-col justify-between h-full p-12 lg:p-16">
          <button onClick={() => navigate("home")} style={{ fontFamily: "var(--font-display)" }} className="text-white/80 uppercase tracking-widest text-xl self-start">Aura Element</button>
          <div>
            <div className="w-8 h-px bg-[#e6c79c] mb-6" />
            <h2 style={{ fontFamily: "var(--font-display)" }} className="text-white text-5xl leading-tight mb-5">Crafted for<br />those who<br />live with<br />intention.</h2>
            <p className="text-white/50 text-sm font-light max-w-xs mb-8">25% oil concentration. 14-hour sillage. Made for those who refuse to disappear.</p>
            <div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#e6c79c]" /><span className="text-[#e6c79c] text-xs uppercase tracking-widest">Any 2 for ₹1,199</span></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center px-7 sm:px-16 bg-[#fafaf8]">
        <div className="max-w-[360px] w-full mx-auto">
          <div className="mb-9">
            <span className="text-[#e6c79c] text-[10px] uppercase tracking-widest block mb-2">Members Portal</span>
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-4xl text-[#111111]">Welcome<br />to the Club.</h1>
            <p className="text-sm text-[#7a6e5f] font-light mt-3 leading-relaxed">Track orders, manage your fragrance profile, and unlock member exclusives.</p>
          </div>

          <div className="flex flex-col gap-5">
            {authError && <div className="bg-red-50 border text-red-600 px-4 py-3 text-xs">{authError}</div>}
            <button onClick={handleGoogleAuth} disabled={googleLoading || emailLoading} className="w-full bg-[#111111] text-white py-4 flex items-center justify-center gap-3 text-sm tracking-widest uppercase disabled:opacity-50">{googleLoading ? "Connecting…" : "Continue with Google"}</button>
            <div className="flex items-center gap-4"><div className="flex-1 h-px bg-[#111111]/10" /><span className="text-[10px] uppercase tracking-wider text-[#7a6e5f]">Or continue with Email</span><div className="flex-1 h-px bg-[#111111]/10" /></div>

            <AnimatePresence mode="wait">
              {emailSent ? (
                <div className="bg-[#f5f0e8] border p-5 text-center"><p className="text-sm font-semibold mb-1">Check your inbox</p><p className="text-xs text-[#7a6e5f]">Link sent to {email}. Click to log in instantly.</p></div>
              ) : (
                <form onSubmit={handleEmailLink} className="flex flex-col gap-4">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-transparent border-b py-3 text-sm outline-none border-[#111111]/15 focus:border-[#e6c79c]" />
                  <button type="submit" disabled={emailLoading || googleLoading || !email.trim()} className="w-full border border-[#111111] py-3.5 text-xs uppercase tracking-widest hover:bg-[#111111] hover:text-white transition-all">{emailLoading ? "Sending Link..." : "Send Magic Link →"}</button>
                </form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Account / Order History Page ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  paid:        { label: "Confirmed",  dot: "bg-blue-400",   text: "text-blue-700",   bg: "bg-blue-50" },
  processing:  { label: "Processing", dot: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50" },
  shipped:     { label: "Dispatched", dot: "bg-[#e6c79c]",  text: "text-[#7a6e5f]", bg: "bg-[#f5f0e8]" },
  delivered:   { label: "Delivered",  dot: "bg-green-400",  text: "text-green-700",  bg: "bg-green-50" },
};

function AccountPage({ navigate }: { navigate: NavigateFn }) {
  const { user, orders, setOrders, setUser } = useAuth();
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user) { navigate("auth"); return; }
    setLoadingOrders(true);
    fetchUserOrders(user.id).then((data) => {
      setOrders(data);
      setLoadingOrders(false);
    });
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrders([]);
    navigate("home");
  };

  if (!user) return null;

  return (
    <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-[#fafaf8] pt-32 pb-16">
      <div className="px-5 sm:px-14 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 items-start">
        <div className="bg-white border p-6 text-center">
          <img src={user.avatar} alt="" className="w-20 h-20 rounded-full border mx-auto mb-3" />
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-xl text-[#111111]">{user.name}</h2>
          <p className="text-xs text-[#7a6e5f] break-all mb-6">{user.email}</p>
          <div className="grid grid-cols-2 gap-2 mb-6 text-center">
            <div className="bg-[#f5f0e8] p-3"><p style={{ fontFamily: "var(--font-display)" }} className="text-2xl">{orders.length}</p><p className="text-[9px] uppercase tracking-widest text-[#7a6e5f]">Orders</p></div>
            <div className="bg-[#f5f0e8] p-3"><p style={{ fontFamily: "var(--font-display)" }} className="text-2xl">{orders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0)}</p><p className="text-[9px] uppercase tracking-widest text-[#7a6e5f]">Bottles</p></div>
          </div>
          <button onClick={() => navigate("home")} className="w-full bg-[#111111] text-white py-3 text-xs uppercase tracking-widest mb-2">Continue Shop</button>
          <button onClick={handleSignOut} className="w-full border py-3 text-xs uppercase tracking-widest text-[#7a6e5f] hover:text-red-500">Sign Out</button>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-2xl mb-6">Order Timeline</h2>
          {loadingOrders ? (
            <p className="text-sm text-[#7a6e5f]">Loading historical updates...</p>
          ) : orders.length === 0 ? (
            <div className="bg-white border p-12 text-center text-[#7a6e5f] text-sm"><Package className="mx-auto text-[#e6c79c] mb-2" /><p>No purchase records found.</p></div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.paid;
                return (
                  <div key={order.id} className="bg-white border p-5">
                    <div className="flex justify-between border-b pb-3 mb-3 text-xs text-[#7a6e5f]">
                      <div><p className="font-mono uppercase text-[#111111]">ID: #{order.id.slice(0,8).toUpperCase()}</p><p className="mt-1">{new Date(order.created_at).toLocaleDateString("en-IN")}</p></div>
                      <span className={`px-2.5 py-1 uppercase tracking-widest font-semibold ${status.bg} ${status.text}`}>{status.label}</span>
                    </div>
                    {order.items.map((i, idx) => (
                      <p key={idx} style={{ fontFamily: "var(--font-display)" }} className="text-lg text-[#111111]">{i.title} <span className="text-sm text-[#7a6e5f] font-sans">× {i.quantity}</span></p>
                    ))}
                    <div className="flex justify-between items-center border-t pt-3 mt-4 text-xs"><span className="uppercase text-[#7a6e5f]">Amount Settled</span><span className="text-base font-semibold text-[#111111]">₹{order.total}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── App Root Architecture ────────────────────────────────────────────────

export default function App() {
  const [cartState, cartDispatch] = useReducer(cartReducer, { items: [] });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!supabaseConfigured) return;

    const mapSession = (u: any): AuthUser => ({
      id: u.id,
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Aura Member",
      email: u.email ?? "",
      avatar: u.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email ?? "A")}&background=e6c79c&color=111111`,
      method: "google",
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSession(session.user));
        fetchUserOrders(session.user.id).then(setOrders);
      }
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(mapSession(session.user));
        fetchUserOrders(session.user.id).then(setOrders);
        if (window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        if (event === "SIGNED_IN") setPage("account"); // 💡 FIXED: Redirect straight to account portal metrics loop when logged inside
      } else {
        setUser(null);
        setOrders([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate: NavigateFn = useCallback((to, productId) => {
    if (to === "auth" && user) { setPage("account"); } 
    else { setPage(to); }
    if (productId) setSelectedProductId(productId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [user]);

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  const isAuthPage = page === "auth";

  return (
    <AuthContext.Provider value={{ user, setUser, orders, setOrders }}>
      <CartContext.Provider value={{ state: cartState, dispatch: cartDispatch, isCartOpen, setIsCartOpen }}>
        <div style={{ fontFamily: "var(--font-body)" }} className="bg-background text-foreground min-h-screen">
          {!isAuthPage && <AnnouncementBar />}
          {!isAuthPage && <Navbar navigate={navigate} currentPage={page} />}
          {!isAuthPage && <CartDrawer />}

          <AnimatePresence mode="wait">
            {page === "home" && <HomePage key="home" navigate={navigate} />}
            {page === "product" && selectedProductId && <ProductDetailPage key={selectedProductId} productId={selectedProductId} navigate={navigate} />}
            {page === "about" && <AboutUsPage key="about" />}
            {page === "contact" && <ContactUsPage key="contact" />}
            {page === "auth" && <AuthPage key="auth" navigate={navigate} />}
            {page === "account" && <AccountPage key="account" navigate={navigate} />}
          </AnimatePresence>
        </div>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}
