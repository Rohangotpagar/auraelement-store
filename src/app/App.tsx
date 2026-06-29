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
  Eye,
  EyeOff,
} from "lucide-react";

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

// Vite env type extension for VITE_RAZORPAY_KEY_ID
interface ImportMetaEnv {
  readonly VITE_RAZORPAY_KEY_ID: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ─── Layout constants ─────────────────────────────────────────────────────
// AnnouncementBar: h-8 (32px) mobile, sm:h-9 (36px)
// Navbar:          h-16 (64px) mobile, sm:h-20 (80px)
// Total offset:    96px mobile, 116px sm
// ─────────────────────────────────────────────────────────────────────────

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

type Page = "home" | "product" | "about" | "contact" | "auth";

interface NavigateFn {
  (page: Page, productId?: string): void;
}

// ─── Auth types ───────────────────────────────────────────────────────────

interface AuthUser {
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  method: "google" | "phone";
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

// ─── Bundle pricing engine ────────────────────────────────────────────────
//
// Rule: any 2 perfumes = ₹999 (regardless of which ones).
// Formula for N total items:
//   pairs   = floor(N / 2)  → each pair costs ₹999
//   singles = N % 2         → each single costs ₹799
//
// Examples:
//   1 bottle → ₹799
//   2 bottles → ₹999
//   3 bottles → ₹999 + ₹799 = ₹1,798
//   4 bottles → ₹999 × 2   = ₹1,998

const BUNDLE_PRICE = 999;
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

// ─── MongoDB-backed product data (Phase 1: seeded locally) ───────────────

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
    main_image_url:
      "https://i.postimg.cc/5y5wKm3G/OCEAN-RUSH-s.jpg",
    secondary_image_url:
      "https://i.postimg.cc/RhHNg17M/aura-element-ocean-rush-perfume-model-lifestyle-jpg-png.jpg",
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
    main_image_url:
      "https://i.postimg.cc/G2BPG5p0/aura-element-primal-storm-luxury-fragrance-bottle-jpg.jpg",
    secondary_image_url:
      "https://i.postimg.cc/wB4ctp9q/aura-element-primal-storm-perfume-model-lifestyle-jpg-png.jpg",
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
    main_image_url:
      "https://i.postimg.cc/vHvngsvJ/aura-element-velvet-blossom-perfume-for-clothing-bottle-jpg.jpg",
    secondary_image_url:
      "https://i.postimg.cc/ZKLNBSct/aura-element-velvet-blossom-perfume-model-lifestyle-jpg-png.jpg",
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
    main_image_url:
      "https://i.postimg.cc/W12MX34f/aura-element-rio-glow-long-lasting-perfume-bottle-jpg.jpg",
    secondary_image_url:
      "https://i.postimg.cc/nhHv0zLW/aura-element-rio-glow-perfume-model-lifestyle-jpg-png.jpg",
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

// ─── Cart reducer ─────────────────────────────────────────────────────────

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

// ─── Cart context ─────────────────────────────────────────────────────────

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

// ─── Mock Razorpay checkout modal ─────────────────────────────────────────

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

const MARQUEE_TEXT =
  "BUY ANY 2 FOR ONLY ₹999  ·  25% OIL CONCENTRATION SIGNATURE  ·  FREE SHIPPING ABOVE ₹999  ·  HANDCRAFTED PARFUM GRADE  ·  ";

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
  const { user, setUser } = useAuth();
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
                          {user.email || user.phone}
                        </p>
                      </div>
                      <button
                        onClick={() => { setUser(null); setProfileOpen(false); }}
                        style={{ fontFamily: "var(--font-body)" }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#7a6e5f] hover:text-[#111111] hover:bg-[#f5f0e8] transition-colors"
                      >
                        <LogOut size={14} strokeWidth={1.5} />
                        Sign Out
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
                    Any 2 for ₹999
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
                        onClick={() => { setUser(null); setMenuOpen(false); }}
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-xs text-[#7a6e5f] tracking-[0.1em] flex items-center gap-1 mt-0.5"
                      >
                        <LogOut size={11} /> Sign Out
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

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-xs tracking-[0.2em] uppercase text-[#7a6e5f] mt-8"
                >
                  25% Concentration · Parfum Grade
                </motion.p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Cart Drawer ───────────────────────────────────────────────────────────

function CartDrawer() {
  const { state, dispatch, isCartOpen, setIsCartOpen } = useCart();
  const [razorpayReady, setRazorpayReady] = useState(false);

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

  const handleCheckout = () => {
    if (!window.Razorpay) {
      alert("Payment gateway is still loading. Please try again in a moment.");
      return;
    }
    const options: RazorpayOptions = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: finalTotal * 100,
      currency: "INR",
      name: "Aura Element",
      description: state.items
        .map((i) => `${i.product.title} ×${i.quantity}`)
        .join(", "),
      handler: (response: RazorpaySuccessResponse) => {
        alert(`Payment successful!\nPayment ID: ${response.razorpay_payment_id}`);
        dispatch({ type: "CLEAR" });
        setIsCartOpen(false);
      },
      prefill: { name: "", email: "", contact: "" },
      notes: {
        items: state.items
          .map((i) => `${i.product.title} ×${i.quantity}`)
          .join("; "),
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
                    Your Bag
                  </h2>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-xs tracking-[0.15em] uppercase text-[#7a6e5f] mt-0.5"
                  >
                    {state.items.length === 0
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

              {pricing.totalQty >= 2 && (
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
                    {pricing.bundlePairs} pair{pricing.bundlePairs > 1 ? "s" : ""} @ ₹999 each
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
                ) : (
                  <div>
                    {state.items.map((item, idx) => (
                      <div
                        key={item.product.id}
                        className={`flex gap-4 py-5 ${
                          idx < state.items.length - 1
                            ? "border-b border-[#111111]/8"
                            : ""
                        }`}
                      >
                        <div className="w-20 h-24 shrink-0 bg-[#f5f0e8] overflow-hidden">
                          <img
                            src={item.product.main_image_url}
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <p
                              style={{ fontFamily: "var(--font-display)" }}
                              className="text-[#111111] text-base leading-tight"
                            >
                              {item.product.title}
                            </p>
                            <p
                              style={{ fontFamily: "var(--font-body)" }}
                              className="text-[#7a6e5f] text-[11px] tracking-[0.1em] mt-0.5"
                            >
                              {item.product.volume} · {item.product.concentration}% Parfum
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                style={{ fontFamily: "var(--font-body)" }}
                                className="text-sm font-medium text-[#111111]"
                              >
                                ₹{item.product.salePrice.toLocaleString("en-IN")}
                              </span>
                              <span
                                style={{ fontFamily: "var(--font-body)" }}
                                className="text-xs text-[#7a6e5f] line-through"
                              >
                                ₹{item.product.mrpPrice.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-[#111111]/15">
                              <button
                                onClick={() =>
                                  dispatch({
                                    type: "UPDATE_QTY",
                                    id: item.product.id,
                                    delta: -1,
                                  })
                                }
                                className="w-7 h-7 flex items-center justify-center text-[#111111]/50 hover:text-[#111111] transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span
                                style={{ fontFamily: "var(--font-body)" }}
                                className="w-7 text-center text-sm font-medium text-[#111111]"
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  dispatch({
                                    type: "UPDATE_QTY",
                                    id: item.product.id,
                                    delta: 1,
                                  })
                                }
                                className="w-7 h-7 flex items-center justify-center text-[#111111]/50 hover:text-[#111111] transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "REMOVE_ITEM",
                                  id: item.product.id,
                                })
                              }
                              className="text-[#111111]/25 hover:text-[#111111] transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {state.items.length > 0 && (
                <div className="border-t border-[#111111]/10 px-6 pt-4 pb-7 flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-[#7a6e5f] text-xs tracking-[0.1em] uppercase"
                    >
                      Subtotal ({pricing.totalQty} item{pricing.totalQty > 1 ? "s" : ""})
                    </span>
                    <span
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-[#7a6e5f] line-through text-sm"
                    >
                      ₹{pricing.lineSubtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {pricing.bundleDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-xs tracking-[0.1em] uppercase text-[#e6c79c] flex items-center gap-1.5"
                      >
                        <Tag size={11} />
                        Bundle Discount
                      </span>
                      <span
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[#e6c79c] font-medium text-sm"
                      >
                        −₹{pricing.bundleDiscount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-xs tracking-[0.1em] uppercase text-[#7a6e5f]"
                    >
                      Delivery Charges
                    </span>
                    <span
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-sm text-[#111111]"
                    >
                      ₹{DELIVERY_FEE}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-[#111111]/8 pt-3">
                    <span
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-xs tracking-[0.15em] uppercase text-[#7a6e5f]"
                    >
                      Total
                    </span>
                    <span
                      style={{ fontFamily: "var(--font-display)" }}
                      className="text-[#111111] text-2xl"
                    >
                      ₹{finalTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {pricing.youSave > 0 && (
                    <p
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-center text-[11px] text-[#e6c79c] tracking-[0.1em]"
                    >
                      You save ₹{pricing.youSave.toLocaleString("en-IN")} on this order 🎉
                    </p>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={!razorpayReady}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="w-full bg-[#111111] text-white py-4 flex items-center justify-center gap-3 hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300 group mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm tracking-[0.2em] uppercase font-medium">
                      {razorpayReady ? "Proceed to Checkout" : "Loading…"}
                    </span>
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
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

  const scrollToCollection = () => {
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative overflow-hidden bg-[#0a0f1a]" style={{ height: "72vh", minHeight: 480 }}>
      <motion.div
        style={{ scale: imgScale, y: imgY }}
        className="absolute inset-0 origin-center"
      >
        <img
          src="https://i.postimg.cc/SKmknBDz/Firefly-Gemini-Flash-(3).png"
          alt="Aura Element cinematic hero"
          className="w-full h-full object-cover"
        />
      </motion.div>

      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 bg-[#111111]"
      />

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="absolute inset-0 flex flex-col justify-end px-6 sm:px-14 lg:px-20 pb-16 sm:pb-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="inline-flex items-center gap-3 mb-5"
        >
          <div className="w-8 h-px bg-[#e6c79c]" />
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#e6c79c] text-[10px] tracking-[0.4em] uppercase"
          >
            Launch Collection · 4 Signatures
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ fontFamily: "var(--font-display)" }}
          className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[1.02] max-w-3xl mb-5 sm:mb-7"
        >
          Wear Your
          <br />
          Story.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ fontFamily: "var(--font-body)" }}
          className="text-white/65 text-sm sm:text-base font-light leading-relaxed max-w-sm mb-8 sm:mb-10"
        >
          25% oil concentration. Built to last 14 hours.
          <br />
          Any 2 bottles — only ₹999.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="flex items-center gap-5 flex-wrap"
        >
          <button
            onClick={scrollToCollection}
            style={{ fontFamily: "var(--font-body)" }}
            className="bg-[#e6c79c] text-[#111111] px-8 py-3.5 text-xs tracking-[0.28em] uppercase font-semibold hover:bg-white transition-colors duration-300 flex items-center gap-2.5 group"
          >
            Shop the Edit
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>

          <div
            className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2"
          >
            <Tag size={13} className="text-[#e6c79c]" />
            <span
              style={{ fontFamily: "var(--font-body)" }}
              className="text-white text-xs tracking-[0.15em]"
            >
              Any 2 for ₹999
            </span>
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 right-8 hidden sm:flex flex-col items-center gap-3">
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-14 bg-gradient-to-b from-[#e6c79c]/70 to-transparent"
        />
        <span
          style={{ fontFamily: "var(--font-body)" }}
          className="text-white/30 text-[9px] tracking-[0.3em] uppercase writing-mode-vertical rotate-180"
        >
          Scroll
        </span>
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────

function ProductCard({
  product,
  navigate,
  index,
}: {
  product: Product;
  navigate: NavigateFn;
  index: number;
}) {
  const { dispatch, setIsCartOpen } = useCart();
  const [hovered, setHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "ADD_ITEM", product });
    setIsCartOpen(true);
  };

  const discount = Math.round(
    ((product.mrpPrice - product.salePrice) / product.mrpPrice) * 100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.65,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group flex flex-col cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate("product", product.id)}
    >
      <div
        className="relative overflow-hidden bg-[#f0ebe0]"
        style={{ aspectRatio: "3/4" }}
      >
        <img
          src={product.main_image_url}
          alt={product.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            hovered ? "opacity-0" : "opacity-100"
          }`}
        />
        <img
          src={product.secondary_image_url}
          alt={`${product.title} alternate`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="bg-[#111111] text-white text-[9px] tracking-[0.15em] uppercase px-2 py-1"
          >
            {discount}% OFF
          </span>
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="bg-[#e6c79c] text-[#111111] text-[9px] tracking-[0.12em] uppercase px-2 py-1 font-semibold"
          >
            25% Parfum
          </span>
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-x-0 bottom-0 p-3 sm:p-4"
        >
          <button
            onClick={handleAddToCart}
            style={{ fontFamily: "var(--font-body)" }}
            className="w-full bg-[#111111]/90 backdrop-blur-sm text-white text-xs tracking-[0.2em] uppercase py-3 hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300"
          >
            Add to Bag
          </button>
        </motion.div>
      </div>

      <div className="pt-2.5 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              style={{ fontFamily: "var(--font-display)" }}
              className="text-[#111111] text-base sm:text-lg leading-tight truncate"
            >
              {product.title}
            </h3>
            <p
              style={{ fontFamily: "var(--font-body)" }}
              className="text-[#7a6e5f] text-[10px] tracking-[0.15em] uppercase mt-0.5"
            >
              {product.tagline}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              style={{ fontFamily: "var(--font-body)" }}
              className="text-[#111111] font-medium text-base"
            >
              ₹{product.salePrice.toLocaleString("en-IN")}
            </p>
            <p
              style={{ fontFamily: "var(--font-body)" }}
              className="text-[#7a6e5f] text-xs line-through"
            >
              ₹{product.mrpPrice.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Bundle Callout Banner ────────────────────────────────────────────────

function BundleCallout() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mx-5 sm:mx-8 lg:mx-14 my-12 bg-[#111111] px-7 sm:px-12 py-8 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
    >
      <div>
        <p
          style={{ fontFamily: "var(--font-body)" }}
          className="text-[#e6c79c] text-xs tracking-[0.3em] uppercase mb-2"
        >
          🎁 Exclusive Launch Offer
        </p>
        <h3
          style={{ fontFamily: "var(--font-display)" }}
          className="text-white text-3xl sm:text-4xl leading-tight"
        >
          Any 2 Fragrances
          <br />
          for just ₹999
        </h3>
        <p
          style={{ fontFamily: "var(--font-body)" }}
          className="text-[#7a6e5f] text-sm font-light mt-2"
        >
          Save ₹599 · Mix &amp; match all four signatures · Automatic at checkout
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {[
          { qty: 1, price: "₹799" },
          { qty: 2, price: "₹999", highlight: true },
          { qty: 3, price: "₹1,798" },
          { qty: 4, price: "₹1,998" },
        ].map(({ qty, price, highlight }) => (
          <div
            key={qty}
            className={`flex items-center justify-between gap-8 px-4 py-2 ${
              highlight
                ? "bg-[#e6c79c] text-[#111111]"
                : "border border-white/10 text-white"
            }`}
          >
            <span
              style={{ fontFamily: "var(--font-body)" }}
              className="text-xs tracking-[0.15em] uppercase"
            >
              {qty} bottle{qty > 1 ? "s" : ""}
              {highlight && " ★"}
            </span>
            <span
              style={{ fontFamily: "var(--font-display)" }}
              className="text-lg"
            >
              {price}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────

function HomePage({ navigate }: { navigate: NavigateFn }) {
  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <HeroSection navigate={navigate} />

      <section id="collection" className="px-5 sm:px-8 lg:px-14 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 sm:mb-12"
        >
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#e6c79c] text-xs tracking-[0.35em] uppercase block mb-3"
          >
            Launch Collection — Phase 1
          </span>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2
              style={{ fontFamily: "var(--font-display)" }}
              className="text-[#111111] text-3xl sm:text-4xl lg:text-5xl"
            >
              4 Signatures
            </h2>
            <p
              style={{ fontFamily: "var(--font-body)" }}
              className="text-[#7a6e5f] text-sm font-light max-w-xs text-right hidden sm:block"
            >
              Each at ₹799. Add any 2 — pay ₹999.
            </p>
          </div>
          <div className="w-full h-px bg-[#111111]/10 mt-6" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10">
          {PRODUCTS.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              navigate={navigate}
              index={i}
            />
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
  const pillars = [
    "Any 2 for ₹999",
    "25% Oil Concentration",
    "Hand-Blended Formulas",
    "Cruelty Free",
    "Lasts 14–16 Hours",
    "Free Shipping ₹999+",
  ];

  return (
    <div className="border-y border-[#e6c79c]/25 bg-[#fafaf8] overflow-hidden py-4 sm:py-5">
      <motion.div
        animate={{ x: "-50%" }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        className="flex whitespace-nowrap shrink-0"
      >
        {[0, 1].map((copy) => (
          <span key={copy} className="inline-flex items-center shrink-0">
            {[...pillars, ...pillars].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-6 sm:gap-10">
                <span
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#7a6e5f]"
                >
                  {p}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#e6c79c] shrink-0" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Philosophy Teaser ─────────────────────────────────────────────────────

function PhilosophyTeaser({ navigate }: { navigate: NavigateFn }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-[500px] sm:min-h-[560px]">
      <div className="order-2 md:order-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-14 sm:py-22 bg-[#f5f0e8]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#e6c79c] text-xs tracking-[0.35em] uppercase block mb-5"
          >
            Our Philosophy
          </span>
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-3xl sm:text-4xl lg:text-5xl leading-tight mb-5"
          >
            Scent as
            <br />
            Second Skin
          </h2>
          <p
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#7a6e5f] font-light leading-relaxed text-sm sm:text-base mb-8 max-w-sm"
          >
            Every Aura Element formula is built to interact with your skin, to become
            something uniquely yours. 25% oil concentration — the highest tier of luxury.
          </p>
          <button
            onClick={() => navigate("about")}
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#111111] text-xs tracking-[0.25em] uppercase flex items-center gap-3 hover:text-[#e6c79c] transition-colors duration-200 group"
          >
            Our Story
            <ChevronRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </motion.div>
      </div>

      <div className="order-1 md:order-2 overflow-hidden bg-[#e6c79c]/15 min-h-[280px] md:min-h-auto">
        <motion.img
          initial={{ scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          src="https://images.unsplash.com/photo-1779562909409-defc901cf57e?w=900&h=700&fit=crop&auto=format"
          alt="Fragrance philosophy"
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}

// ─── Product Image Gallery ────────────────────────────────────────────────

function ProductImageGallery({
  images,
  title,
  badges,
  onBack,
}: {
  images: string[];
  title: string;
  badges: React.ReactNode;
  onBack: () => void;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col bg-[#f5f0e8]">

      {/* ── BIG main image on top ── */}
      <div className="relative w-full overflow-hidden bg-[#f5f0e8]" style={{ aspectRatio: "3/2" }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={active}
            src={images[active]}
            alt={`${title} — view ${active + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-contain p-6 sm:p-8"
          />
        </AnimatePresence>

        {/* Back button */}
        <button
          onClick={onBack}
          style={{ fontFamily: "var(--font-body)" }}
          className="absolute top-4 left-4 z-10 text-[10px] tracking-[0.2em] uppercase text-white/85 hover:text-white bg-[#111111]/35 backdrop-blur-sm px-3 py-2 transition-colors"
        >
          ← Back
        </button>

        {/* Badges */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
          {badges}
        </div>

        {/* Counter */}
        <div className="absolute bottom-4 right-4 z-10 bg-[#111111]/45 backdrop-blur-sm px-2.5 py-1">
          <span style={{ fontFamily: "var(--font-body)" }} className="text-white text-[11px] tracking-[0.12em]">
            {active + 1} / {images.length}
          </span>
        </div>
      </div>

      {/* ── Small thumbnails at bottom ── */}
      <div className="flex flex-nowrap gap-2.5 overflow-x-auto overflow-y-hidden bg-white border-t border-[#111111]/8 px-[170px] py-[12px]" style={{ height: 104 }}>
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Show image ${i + 1}`}
            className={`relative shrink-0 overflow-hidden transition-all duration-200 ${
              active === i
                ? "ring-2 ring-[#e6c79c] ring-offset-1 opacity-100"
                : "opacity-50 hover:opacity-90"
            }`}
            style={{ width: 64, height: 80, minWidth: 64 }}
          >
            <img
              src={src.replace("w=900&h=1100", "w=160&h=200")}
              alt={`${title} thumbnail ${i + 1}`}
              className="w-full h-full object-cover"
            />
            {active === i && (
              <motion.div
                layoutId="thumb-active"
                className="absolute inset-0 border-2 border-[#e6c79c]"
              />
            )}
          </button>
        ))}
      </div>

    </div>
  );
}

// ─── Product Detail Page ────────────────────────────────────────────────────

function ProductDetailPage({
  productId,
  navigate,
}: {
  productId: string;
  navigate: NavigateFn;
}) {
  const product = PRODUCTS.find((p) => p.id === productId);
  const { dispatch, state, setIsCartOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"notes" | "about">("notes");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <p style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f]">
          Product not found.
        </p>
      </div>
    );
  }

  const currentCartQty = state.items.reduce((s, i) => s + i.quantity, 0);
  const previewQty = currentCartQty + quantity;
  const previewPairs = Math.floor(previewQty / 2);
  const previewSingles = previewQty % 2;
  const previewTotal =
    previewPairs * BUNDLE_PRICE + previewSingles * SALE_PRICE;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      dispatch({ type: "ADD_ITEM", product });
    }
    setIsCartOpen(true);
  };

  const checkoutItems = [{ product, quantity }];
  const checkoutPricing = computeBundlePricing(checkoutItems);

  const discount = Math.round(
    ((product.mrpPrice - product.salePrice) / product.mrpPrice) * 100
  );

  return (
    <>
      <MockCheckoutModal
        isOpen={checkoutOpen}
        grandTotal={checkoutPricing.grandTotal}
        items={checkoutItems}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => setCheckoutOpen(false)}
      />

      <motion.div
        key={productId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="min-h-screen pt-24 sm:pt-[116px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-96px)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="md:sticky md:top-[96px] md:self-start md:max-h-[calc(100vh-96px)]"
          >
            <ProductImageGallery
              images={product.gallery}
              title={product.title}
              onBack={() => navigate("home")}
              badges={
                <>
                  <span
                    style={{ fontFamily: "var(--font-body)" }}
                    className="bg-[#111111] text-white text-[9px] tracking-[0.15em] uppercase px-2 py-1 text-right"
                  >
                    {discount}% OFF
                  </span>
                  <span
                    style={{ fontFamily: "var(--font-body)" }}
                    className="bg-[#e6c79c] text-[#111111] text-[9px] tracking-[0.12em] uppercase px-2 py-1 font-semibold text-right"
                  >
                    25% Parfum
                  </span>
                </>
              }
            />
          </motion.div>

          <div className="flex flex-col px-5 sm:px-8 lg:px-12 py-10 sm:py-12 md:overflow-y-auto md:sticky md:top-[116px] md:max-h-[calc(100vh-116px)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <span
                style={{ fontFamily: "var(--font-body)" }}
                className="text-[#e6c79c] text-xs tracking-[0.3em] uppercase block mb-3"
              >
                {product.tagline}
              </span>
              <h1
                style={{ fontFamily: "var(--font-display)" }}
                className="text-[#111111] text-4xl sm:text-5xl leading-tight mb-3"
              >
                {product.title}
              </h1>

              <div className="flex items-baseline gap-3 mb-6">
                <span
                  style={{ fontFamily: "var(--font-display)" }}
                  className="text-[#111111] text-3xl"
                >
                  ₹{product.salePrice.toLocaleString("en-IN")}
                </span>
                <span
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-[#7a6e5f] text-lg line-through"
                >
                  ₹{product.mrpPrice.toLocaleString("en-IN")}
                </span>
                <span
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-xs tracking-[0.1em] bg-[#111111] text-white px-2 py-0.5"
                >
                  {discount}% OFF
                </span>
              </div>

              <div className="bg-[#111111] px-4 py-3 mb-6 flex items-center gap-3">
                <Tag size={13} className="text-[#e6c79c] shrink-0" />
                <p
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-white text-xs tracking-[0.08em] leading-snug"
                >
                  Add 1 more fragrance to your bag →{" "}
                  <span className="text-[#e6c79c] font-medium">
                    pay only ₹999 for both
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: "Concentration", val: `${product.concentration}%` },
                  { label: "Volume", val: product.volume },
                  { label: "Longevity", val: "14h+" },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="border border-[#e6c79c]/50 px-3 py-3 text-center"
                  >
                    <p
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-[9px] tracking-[0.2em] uppercase text-[#7a6e5f] mb-1"
                    >
                      {label}
                    </p>
                    <p
                      style={{ fontFamily: "var(--font-display)" }}
                      className="text-[#111111] text-lg"
                    >
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex border-b border-[#111111]/10 mb-5">
                {(["notes", "about"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ fontFamily: "var(--font-body)" }}
                    className={`text-xs tracking-[0.2em] uppercase pb-3 pr-7 border-b-2 -mb-px transition-all duration-200 ${
                      activeTab === tab
                        ? "border-[#e6c79c] text-[#111111]"
                        : "border-transparent text-[#7a6e5f] hover:text-[#111111]"
                    }`}
                  >
                    {tab === "notes" ? "Fragrance Notes" : "About"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "notes" ? (
                  <motion.div
                    key="notes"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 mb-7"
                  >
                    {(
                      [
                        { label: "Top", values: product.notes.top },
                        { label: "Heart", values: product.notes.heart },
                        { label: "Base", values: product.notes.base },
                      ] as const
                    ).map(({ label, values }) => (
                      <div key={label} className="flex gap-4">
                        <span
                          style={{ fontFamily: "var(--font-body)" }}
                          className="text-[10px] tracking-[0.2em] uppercase text-[#e6c79c] w-10 pt-0.5 shrink-0"
                        >
                          {label}
                        </span>
                        <p
                          style={{ fontFamily: "var(--font-body)" }}
                          className="text-[#111111] text-sm font-light"
                        >
                          {values.join(" · ")}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-7"
                  >
                    <p
                      style={{ fontFamily: "var(--font-body)" }}
                      className="text-[#7a6e5f] font-light leading-relaxed text-sm"
                    >
                      {product.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 mb-2">
                <span
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-xs tracking-[0.15em] uppercase text-[#7a6e5f]"
                >
                  Qty
                </span>
                <div className="flex items-center border border-[#111111]/15">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#111111]/50 hover:text-[#111111] transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span
                    style={{ fontFamily: "var(--font-body)" }}
                    className="w-10 text-center font-medium text-[#111111]"
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[#111111]/50 hover:text-[#111111] transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                {currentCartQty > 0 && previewPairs > 0 && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-xs text-[#e6c79c] tracking-[0.08em]"
                  >
                    → bag total: ₹{previewTotal.toLocaleString("en-IN")}
                  </motion.span>
                )}
              </div>

              <div className="flex flex-col gap-3 mt-5">
                <button
                  onClick={handleAddToCart}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="w-full border-2 border-[#111111] text-[#111111] py-4 text-xs tracking-[0.25em] uppercase font-semibold hover:bg-[#111111] hover:text-white transition-all duration-300 flex items-center justify-center gap-3 group"
                >
                  Add to Bag
                  <ShoppingBag
                    size={14}
                    strokeWidth={1.5}
                    className="group-hover:scale-110 transition-transform"
                  />
                </button>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="w-full bg-[#e6c79c] text-[#111111] py-4 text-xs tracking-[0.25em] uppercase font-semibold hover:bg-[#111111] hover:text-white transition-all duration-300"
                >
                  Buy Now · ₹{(product.salePrice * quantity).toLocaleString("en-IN")}
                </button>
              </div>

              
            </motion.div>
          </div>
        </div>

        <RelatedProducts currentId={productId} navigate={navigate} />
        <Footer navigate={navigate} />
      </motion.div>
    </>
  );
}

// ─── Related Products ──────────────────────────────────────────────────────

function RelatedProducts({
  currentId,
  navigate,
}: {
  currentId: string;
  navigate: NavigateFn;
}) {
  const related = PRODUCTS.filter((p) => p.id !== currentId);
  return (
    <section className="mt-6 border-t-4 border-[#f5f0e8] bg-white px-[56px] py-[479px]">
      <div className="flex items-end justify-between mb-10">
        <h3
          style={{ fontFamily: "var(--font-display)" }}
          className="text-[#111111] text-2xl sm:text-3xl"
        >
          Complete the Set
        </h3>
        <span
          style={{ fontFamily: "var(--font-body)" }}
          className="text-[#e6c79c] text-xs tracking-[0.15em] uppercase hidden sm:block"
        >
          Add 2 → ₹999
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6">
        {related.map((p, i) => (
          <ProductCard key={p.id} product={p} navigate={navigate} index={i} />
        ))}
      </div>
    </section>
  );
}

// ─── About Us ──────────────────────────────────────────────────────────────

function AboutUsPage() {
  const values = [
    {
      title: "25% Concentration Standard",
      body: "Every formula carries 25% fragrance oil — the Parfum tier. Far exceeding the industry's 15–20% standard. This is not a marketing claim. It is our baseline.",
    },
    {
      title: "Purity of Ingredient",
      body: "We source raw materials directly from growers in Kannauj, Grasse, and Istanbul — paying a fair premium for materials harvested at peak potency.",
    },
    {
      title: "No Synthetic Shortcuts",
      body: "No synthetic extenders, no ethanol dilution tricks. What you smell at hour one, you still smell at hour twelve.",
    },
    {
      title: "Made in Small Batches",
      body: "Our perfumer blends by hand in batches of 200 units. Every bottle receives the same attention as the first prototype.",
    },
  ];

  return (
    <motion.div
      key="about"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen pt-24 sm:pt-[116px]"
    >
      <div className="relative h-[48vh] sm:h-[62vh] overflow-hidden bg-[#0a0f1a]">
        <img
          src="https://images.unsplash.com/photo-1779562909409-defc901cf57e?w=1600&h=800&fit=crop&auto=format"
          alt="Aura Element atelier"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-5 sm:px-8 lg:px-14 pb-10 sm:pb-14">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#e6c79c] text-xs tracking-[0.35em] uppercase mb-4 block"
          >
            Our Story
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.45 }}
            style={{ fontFamily: "var(--font-display)" }}
            className="text-white text-4xl sm:text-5xl lg:text-6xl leading-tight max-w-2xl"
          >
            Built on the belief that luxury should last.
          </motion.h1>
        </div>
      </div>

      <section className="px-5 sm:px-8 lg:px-14 py-12 sm:py-20 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-2xl sm:text-3xl leading-relaxed mb-8"
          >
            Aura Element was founded with a single refusal: to make a perfume that disappears before lunch.
          </p>
          <p
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#7a6e5f] font-light leading-relaxed text-base sm:text-lg mb-6"
          >
            In an industry addicted to water-based sprays and 8% concentrations dressed up in designer bottles, we chose a different path. We apprenticed with a third-generation ittar master in Kannauj. We spent two years learning which oud woods age gracefully, which rose varieties hold their structure in Indian heat, and which amber resins anchor a formula for twelve hours rather than two.
          </p>
          <p
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#7a6e5f] font-light leading-relaxed text-base sm:text-lg"
          >
            The result is a house built on one promise: what you apply in the morning will still speak for you at midnight.
          </p>
        </motion.div>
      </section>

      <div className="w-full h-px bg-[#111111]/10" />

      <section className="px-5 sm:px-8 lg:px-14 py-12 sm:py-20">
        <div className="mb-10">
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#e6c79c] text-xs tracking-[0.35em] uppercase block mb-3"
          >
            Our Standards
          </span>
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-3xl sm:text-4xl"
          >
            What We Never Compromise
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="border-l-2 border-[#e6c79c] pl-6"
            >
              <h3
                style={{ fontFamily: "var(--font-display)" }}
                className="text-[#111111] text-xl mb-3"
              >
                {v.title}
              </h3>
              <p
                style={{ fontFamily: "var(--font-body)" }}
                className="text-[#7a6e5f] font-light leading-relaxed text-sm sm:text-base"
              >
                {v.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer navigate={() => {}} />
    </motion.div>
  );
}

// ─── Contact Us ────────────────────────────────────────────────────────────

function ContactUsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const validate = (): boolean => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (form.message.trim().length < 20)
      e.message = "Please write at least 20 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSubmitted(true);
  };

  const fieldClass = (field: keyof typeof form) =>
    `w-full bg-transparent border-b py-3 text-sm text-[#111111] placeholder-[#7a6e5f]/50 focus:outline-none transition-colors duration-200 ${
      errors[field]
        ? "border-red-400"
        : "border-[#111111]/15 focus:border-[#e6c79c]"
    }`;

  return (
    <motion.div
      key="contact"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen pt-24 sm:pt-[116px]"
    >
      <div className="px-5 sm:px-8 lg:px-14 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16"
        >
          <span
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#e6c79c] text-xs tracking-[0.35em] uppercase block mb-3"
          >
            Get in Touch
          </span>
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-4xl sm:text-5xl lg:text-6xl"
          >
            Contact Us
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-start"
                >
                  <div className="w-12 h-12 border border-[#e6c79c] flex items-center justify-center mb-6">
                    <Check size={20} className="text-[#e6c79c]" />
                  </div>
                  <h2
                    style={{ fontFamily: "var(--font-display)" }}
                    className="text-[#111111] text-3xl mb-4"
                  >
                    Message Received
                  </h2>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[#7a6e5f] font-light leading-relaxed max-w-sm"
                  >
                    Thank you, {form.name.split(" ")[0]}. We respond within 24 hours on all business days.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", email: "", subject: "", message: "" });
                    }}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="mt-8 text-xs tracking-[0.2em] uppercase text-[#e6c79c] hover:text-[#111111] transition-colors"
                  >
                    Send Another →
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-7"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your Name"
                        autoComplete="name"
                        style={{ fontFamily: "var(--font-body)" }}
                        className={fieldClass("name")}
                      />
                      {errors.name && (
                        <p
                          style={{ fontFamily: "var(--font-body)" }}
                          className="text-red-400 text-xs mt-1"
                        >
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Email Address"
                        autoComplete="email"
                        style={{ fontFamily: "var(--font-body)" }}
                        className={fieldClass("email")}
                      />
                      {errors.email && (
                        <p
                          style={{ fontFamily: "var(--font-body)" }}
                          className="text-red-400 text-xs mt-1"
                        >
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      style={{ fontFamily: "var(--font-body)" }}
                      className={`${fieldClass("subject")} cursor-pointer appearance-none`}
                    >
                      <option value="" disabled>
                        Select a Subject
                      </option>
                      <option value="order">Order Enquiry</option>
                      <option value="product">Product Information</option>
                      <option value="wholesale">Wholesale / Retail Partnership</option>
                      <option value="press">Press &amp; Media</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.subject && (
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-red-400 text-xs mt-1"
                      >
                        {errors.subject}
                      </p>
                    )}
                  </div>
                  <div>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Your message…"
                      rows={5}
                      style={{ fontFamily: "var(--font-body)" }}
                      className={`${fieldClass("message")} resize-none`}
                    />
                    {errors.message && (
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-red-400 text-xs mt-1"
                      >
                        {errors.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    style={{ fontFamily: "var(--font-body)" }}
                    className="self-start bg-[#111111] text-white px-10 py-4 text-xs tracking-[0.25em] uppercase font-medium hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300 disabled:opacity-50 flex items-center gap-3 group"
                  >
                    {sending ? (
                      <>
                        Sending
                        <span className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 0.9,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                              className="w-1 h-1 rounded-full bg-current"
                            />
                          ))}
                        </span>
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send
                          size={14}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-9 border-t lg:border-t-0 lg:border-l border-[#111111]/10 pt-10 lg:pt-0 lg:pl-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3
                style={{ fontFamily: "var(--font-display)" }}
                className="text-[#111111] text-xl mb-6"
              >
                Reach us directly
              </h3>
              <div className="flex flex-col gap-6">
                {[
                  {
                    icon: <MapPin size={15} strokeWidth={1.5} className="text-[#e6c79c] shrink-0 mt-0.5" />,
                    label: "Studio",
                    value: "Aura Element \nPune 411 046",
                  },
                  {
                    icon: <Phone size={15} strokeWidth={1.5} className="text-[#e6c79c] shrink-0 mt-0.5" />,
                    label: "Phone",
                    value: "+91 98500 59812\nMon – Sat, 10am – 6pm IST",
                  },
                  {
                    icon: <Mail size={15} strokeWidth={1.5} className="text-[#e6c79c] shrink-0 mt-0.5" />,
                    label: "Email",
                    value: "auraelement.in@gmail.com\nsupport@auraelement.in",
                  },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    {icon}
                    <div>
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[10px] tracking-[0.2em] uppercase text-[#e6c79c] mb-1"
                      >
                        {label}
                      </p>
                      <p
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-[#7a6e5f] font-light text-sm leading-relaxed whitespace-pre-line"
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-[#111111] p-5"
            >
              <p
                style={{ fontFamily: "var(--font-body)" }}
                className="text-[#e6c79c] text-[10px] tracking-[0.2em] uppercase mb-2"
              >
                Bundle Offer
              </p>
              <p
                style={{ fontFamily: "var(--font-display)" }}
                className="text-white text-2xl mb-1"
              >
                Any 2 for ₹999
              </p>
              <p
                style={{ fontFamily: "var(--font-body)" }}
                className="text-[#7a6e5f] text-xs"
              >
                Automatically applied at checkout
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer navigate={() => {}} />
    </motion.div>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer({ navigate }: { navigate: NavigateFn }) {
  return (
    <footer className="border-t border-[#111111]/10 px-5 sm:px-8 lg:px-14 py-12 sm:py-16 bg-[#fafaf8]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
        <div>
          <button
            onClick={() => navigate("home")}
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-2xl tracking-widest uppercase block mb-3"
          >
            Aura Element
          </button>
          <p
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[#7a6e5f] text-sm font-light leading-relaxed max-w-[210px]"
          >
            Parfum grade fragrances for those who live with intention.
          </p>
        </div>
        <div>
          <p
            style={{ fontFamily: "var(--font-body)" }}
            className="text-[10px] tracking-[0.25em] uppercase text-[#e6c79c] mb-4"
          >
            Navigate
          </p>
          <div className="flex flex-col gap-3">
            {(
              [
                { label: "Shop", page: "home" },
                { label: "Our Story", page: "about" },
                { label: "Contact", page: "contact" },
              ] as { label: string; page: Page }[]
            ).map(({ label, page }) => (
              <button
                key={page}
                onClick={() => navigate(page)}
                style={{ fontFamily: "var(--font-body)" }}
                className="text-left text-sm text-[#7a6e5f] hover:text-[#e6c79c] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[#111111]/8 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <p
          style={{ fontFamily: "var(--font-body)" }}
          className="text-[11px] tracking-[0.12em] text-[#7a6e5f]"
        >
          © {new Date().getFullYear()} Aura Element. All rights reserved.
        </p>
        <p
          style={{ fontFamily: "var(--font-body)" }}
          className="text-[11px] text-[#7a6e5f]"
        >
          Crafted with intention · Pune, India
        </p>
      </div>
    </footer>
  );
}

// ─── Auth Page ─────────────────────────────────────────────────────────────

type AuthMode = "signin" | "signup";
type AuthStep = "form" | "otp" | "done";
type AuthMethod = "google" | "phone" | "email";

const MOCK_OTP = "123456";

const AVATAR_SEEDS = [
  "https://i.postimg.cc/52bmxKpy/Login-icon.png",
  
];

function AuthPage({ navigate }: { navigate: NavigateFn }) {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [step, setStep] = useState<AuthStep>("form");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setPassword("");
    setOtp(["", "", "", "", "", ""]); setOtpError(""); setStep("form");
  };

  const switchMode = (m: AuthMode) => { setMode(m); resetForm(); };

  const randomAvatar = () => AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];

  const handleGoogleAuth = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setUser({
      name: "Priya Sharma",
      email: "priya.sharma@gmail.com",
      avatar: AVATAR_SEEDS[0],
      method: "google",
    });
    setLoading(false);
    navigate("home");
  };

  const handleSendOtp = async () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setOtpError("");
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const entered = otp.join("");
    if (entered.length < 6) { setOtpError("Please enter the 6-digit code."); return; }
    if (entered !== MOCK_OTP) { setOtpError("Incorrect code. Try 123456 for demo."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setUser({
      name: name || "Aura Member",
      email: email || "",
      phone: `+91 ${phone}`,
      avatar: randomAvatar(),
      method: "phone",
    });
    setLoading(false);
    navigate("home");
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    if (mode === "signup" && !name) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setUser({
      name: name || email.split("@")[0],
      email,
      avatar: randomAvatar(),
      method: "google",
    });
    setLoading(false);
    navigate("home");
  };

  const inputBase =
    "w-full bg-transparent border-b border-[#111111]/20 focus:border-[#e6c79c] py-3 text-sm text-[#111111] placeholder-[#7a6e5f]/50 outline-none transition-colors duration-200";

  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen grid grid-cols-1 md:grid-cols-2"
    >
      {/* Left — cinematic image panel */}
      <div className="relative hidden md:block bg-[#0a0f1a] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=900&h=1200&fit=crop&auto=format"
          alt="Aura Element"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <button
            onClick={() => navigate("home")}
            style={{ fontFamily: "var(--font-display)" }}
            className="text-white text-2xl tracking-widest uppercase self-start"
          >
            Aura Element
          </button>
          <div>
            <span
              style={{ fontFamily: "var(--font-body)" }}
              className="text-[#e6c79c] text-xs tracking-[0.35em] uppercase block mb-3"
            >
              25% Oil Concentration · Parfum Grade
            </span>
            <h2
              style={{ fontFamily: "var(--font-display)" }}
              className="text-white text-4xl lg:text-5xl leading-tight mb-4"
            >
              Your scent.
              <br />
              Your story.
            </h2>
            <p
              style={{ fontFamily: "var(--font-body)" }}
              className="text-white/50 text-sm font-light leading-relaxed max-w-xs"
            >
              Join Aura Element to track your orders, save your favourites, and access exclusive member offers.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5">
              <Tag size={13} className="text-[#e6c79c]" />
              <span style={{ fontFamily: "var(--font-body)" }} className="text-white text-xs tracking-[0.12em]">
                Any 2 fragrances for ₹999
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — auth form panel */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 min-h-screen md:min-h-0 bg-white">
        {/* Mobile brand header */}
        <div className="md:hidden mb-8 text-center">
          <button
            onClick={() => navigate("home")}
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[#111111] text-2xl tracking-widest uppercase"
          >
            Aura Element
          </button>
        </div>

        <div className="max-w-sm w-full mx-auto">
          {/* Mode tabs */}
          <div className="flex border-b border-[#111111]/12 mb-8">
            {(["signin", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{ fontFamily: "var(--font-body)" }}
                className={`flex-1 pb-3 text-xs tracking-[0.22em] uppercase border-b-2 -mb-px transition-all duration-200 ${
                  mode === m
                    ? "border-[#e6c79c] text-[#111111]"
                    : "border-transparent text-[#7a6e5f] hover:text-[#111111]"
                }`}
              >
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === "otp" ? (
              // ── OTP verification screen ─────────────────────────────────
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setStep("form")}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-xs tracking-[0.15em] uppercase text-[#7a6e5f] hover:text-[#111111] transition-colors mb-6 flex items-center gap-2"
                >
                  ← Back
                </button>
                <div className="mb-6">
                  <h3
                    style={{ fontFamily: "var(--font-display)" }}
                    className="text-[#111111] text-2xl mb-2"
                  >
                    Verify your number
                  </h3>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[#7a6e5f] text-sm font-light"
                  >
                    We sent a 6-digit code to{" "}
                    <span className="text-[#111111]">+91 {phone}</span>
                    <br />
                    <span className="text-[10px] tracking-[0.1em] text-[#e6c79c]">
                      Demo: use 123456
                    </span>
                  </p>
                </div>

                <div className="flex gap-2.5 mb-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(idx, e)}
                      style={{ fontFamily: "var(--font-display)" }}
                      className={`w-full aspect-square text-center text-xl text-[#111111] border-2 focus:outline-none transition-colors duration-200 ${
                        otpError
                          ? "border-red-400"
                          : digit
                          ? "border-[#e6c79c]"
                          : "border-[#111111]/15 focus:border-[#e6c79c]"
                      }`}
                    />
                  ))}
                </div>
                {otpError && (
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-red-400 text-xs mb-4"
                  >
                    {otpError}
                  </p>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.join("").length < 6}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="w-full bg-[#111111] text-white py-4 text-xs tracking-[0.28em] uppercase font-semibold hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300 disabled:opacity-40 mt-5 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      Verifying
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full inline-block"
                      />
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>

                <button
                  onClick={handleSendOtp}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="w-full text-center text-xs text-[#7a6e5f] hover:text-[#e6c79c] transition-colors mt-4"
                >
                  Resend code
                </button>
              </motion.div>
            ) : (
              // ── Main auth form ───────────────────────────────────────────
              <motion.div
                key={`form-${mode}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                {/* Heading */}
                <div className="mb-7">
                  <h3
                    style={{ fontFamily: "var(--font-display)" }}
                    className="text-[#111111] text-2xl sm:text-3xl"
                  >
                    {mode === "signin" ? "Welcome back." : "Join Aura Element."}
                  </h3>
                  <p
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[#7a6e5f] text-sm font-light mt-1"
                  >
                    {mode === "signin"
                      ? "Sign in to your account to continue."
                      : "Create your account in seconds."}
                  </p>
                </div>

                {/* Google button */}
                <button
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="w-full border border-[#111111]/15 py-3.5 text-sm text-[#111111] hover:border-[#e6c79c] hover:bg-[#f5f0e8] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 mb-5"
                >
                  {loading && method === "google" ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full"
                    />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span>
                    {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
                  </span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 h-px bg-[#111111]/10" />
                  <span
                    style={{ fontFamily: "var(--font-body)" }}
                    className="text-[11px] tracking-[0.2em] uppercase text-[#7a6e5f]"
                  >
                    Or
                  </span>
                  <div className="flex-1 h-px bg-[#111111]/10" />
                </div>

                {/* Method tabs: Phone / Email */}
                <div className="flex gap-2 mb-6">
                  {(["phone", "email"] as AuthMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      style={{ fontFamily: "var(--font-body)" }}
                      className={`flex-1 py-2 text-xs tracking-[0.15em] uppercase border transition-all duration-200 ${
                        method === m
                          ? "border-[#e6c79c] bg-[#f5f0e8] text-[#111111]"
                          : "border-[#111111]/12 text-[#7a6e5f] hover:border-[#e6c79c]/50"
                      }`}
                    >
                      {m === "phone" ? "📱 Phone OTP" : "✉️ Email"}
                    </button>
                  ))}
                </div>

                {/* Phone OTP method */}
                {method === "phone" && (
                  <div className="flex flex-col gap-5">
                    {mode === "signup" && (
                      <div>
                        <label style={{ fontFamily: "var(--font-body)" }} className="text-[10px] tracking-[0.18em] uppercase text-[#7a6e5f] block mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          autoComplete="name"
                          style={{ fontFamily: "var(--font-body)" }}
                          className={inputBase}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ fontFamily: "var(--font-body)" }} className="text-[10px] tracking-[0.18em] uppercase text-[#7a6e5f] block mb-1.5">
                        Mobile Number
                      </label>
                      <div className="flex items-center border-b border-[#111111]/20 focus-within:border-[#e6c79c] transition-colors">
                        <span style={{ fontFamily: "var(--font-body)" }} className="text-sm text-[#111111] pr-2 py-3 shrink-0 border-r border-[#111111]/15 mr-3">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="98765 43210"
                          autoComplete="tel"
                          style={{ fontFamily: "var(--font-body)" }}
                          className="flex-1 bg-transparent py-3 text-sm text-[#111111] placeholder-[#7a6e5f]/50 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => { setMethod("phone"); handleSendOtp(); }}
                      disabled={loading || phone.replace(/\D/g, "").length < 10}
                      style={{ fontFamily: "var(--font-body)" }}
                      className="w-full bg-[#111111] text-white py-4 text-xs tracking-[0.28em] uppercase font-semibold hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          Sending OTP
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
                          />
                        </>
                      ) : (
                        "Send OTP →"
                      )}
                    </button>
                  </div>
                )}

                {/* Email method */}
                {method === "email" && (
                  <div className="flex flex-col gap-5">
                    {mode === "signup" && (
                      <div>
                        <label style={{ fontFamily: "var(--font-body)" }} className="text-[10px] tracking-[0.18em] uppercase text-[#7a6e5f] block mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          autoComplete="name"
                          style={{ fontFamily: "var(--font-body)" }}
                          className={inputBase}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ fontFamily: "var(--font-body)" }} className="text-[10px] tracking-[0.18em] uppercase text-[#7a6e5f] block mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                        style={{ fontFamily: "var(--font-body)" }}
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label style={{ fontFamily: "var(--font-body)" }} className="text-[10px] tracking-[0.18em] uppercase text-[#7a6e5f] block mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          style={{ fontFamily: "var(--font-body)" }}
                          className={`${inputBase} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-0 bottom-3 text-[#7a6e5f] hover:text-[#111111] transition-colors"
                        >
                          {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                        </button>
                      </div>
                    </div>
                    {mode === "signin" && (
                      <button
                        style={{ fontFamily: "var(--font-body)" }}
                        className="text-right text-xs text-[#7a6e5f] hover:text-[#e6c79c] transition-colors -mt-2"
                      >
                        Forgot password?
                      </button>
                    )}
                    <button
                      onClick={handleEmailAuth}
                      disabled={loading || !email || !password || (mode === "signup" && !name)}
                      style={{ fontFamily: "var(--font-body)" }}
                      className="w-full bg-[#111111] text-white py-4 text-xs tracking-[0.28em] uppercase font-semibold hover:bg-[#e6c79c] hover:text-[#111111] transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          {mode === "signin" ? "Signing In" : "Creating Account"}
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
                          />
                        </>
                      ) : mode === "signin" ? (
                        "Sign In →"
                      ) : (
                        "Create Account →"
                      )}
                    </button>
                  </div>
                )}

                <p
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-center text-xs text-[#7a6e5f] mt-6 leading-relaxed"
                >
                  {mode === "signin" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        onClick={() => switchMode("signup")}
                        className="text-[#e6c79c] hover:text-[#111111] transition-colors"
                      >
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => switchMode("signin")}
                        className="text-[#e6c79c] hover:text-[#111111] transition-colors"
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </p>

                <p
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-center text-[10px] text-[#7a6e5f]/60 mt-4 leading-relaxed"
                >
                  By continuing you agree to our Terms of Service &amp; Privacy Policy.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────

export default function App() {
  const [cartState, cartDispatch] = useReducer(cartReducer, { items: [] });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const navigate: NavigateFn = useCallback((to, productId) => {
    setPage(to);
    if (productId) setSelectedProductId(productId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  const isAuthPage = page === "auth";

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <CartContext.Provider
        value={{
          state: cartState,
          dispatch: cartDispatch,
          isCartOpen,
          setIsCartOpen,
        }}
      >
        <div
          style={{ fontFamily: "var(--font-body)" }}
          className="bg-background text-foreground min-h-screen"
        >
          {!isAuthPage && <AnnouncementBar />}
          {!isAuthPage && <Navbar navigate={navigate} currentPage={page} />}
          {!isAuthPage && <CartDrawer />}

          <AnimatePresence mode="wait">
            {page === "home" && (
              <HomePage key="home" navigate={navigate} />
            )}
            {page === "product" && selectedProductId && (
              <ProductDetailPage
                key={selectedProductId}
                productId={selectedProductId}
                navigate={navigate}
              />
            )}
            {page === "about" && <AboutUsPage key="about" />}
            {page === "contact" && <ContactUsPage key="contact" />}
            {page === "auth" && <AuthPage key="auth" navigate={navigate} />}
          </AnimatePresence>
        </div>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}
