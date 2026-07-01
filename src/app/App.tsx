import {
  useState,
  useReducer,
  useContext,
  createContext,
  useCallback,
  useEffect,
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
  Instagram,
  ShieldCheck,
  Truck,
  RotateCcw,
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

// ─── ✅ UPDATED PAGE NAVIGATION SWITCH CORES ──────────────────────────────
type Page = "home" | "product" | "about" | "contact" | "shipping-policy" | "privacy-policy" | "refund-policy";

interface NavigateFn {
  (page: Page, productId?: string): void;
}

const BUNDLE_PRICE = 1199;
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

const MARQUEE_TEXT =
  "BUY ANY 2 FOR ONLY ₹1,199  ·  FREE DELIVERY ON 2+ BOTTLES  ·  25% OIL CONCENTRATION SIGNATURE  ·  HANDCRAFTED PARFUM GRADE  ·  ";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (page: Page) => {
    navigate(page);
    setMenuOpen(false);
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
            <a
              href="https://www.instagram.com/auraelement.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#111111] hover:text-[#e6c79c] transition-colors duration-200 p-1"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={20} strokeWidth={1.5} />
            </a>

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

            <button
              className="md:hidden text-[#111111] hover:text-[#e6c79c] transition-colors p-1"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
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
                <div className="absolute top-0 left-0 right-0" style={{ height: "32px", background: "#000" }} />

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
                  <p style={{ fontFamily: "var(--font-body)" }} className="text-[#e6c79c] text-xs tracking-[0.2em] uppercase">
                    🎁 Bundle Offer
                  </p>
                  <p style={{ fontFamily: "var(--font-display)" }} className="text-white text-xl mt-1">
                    Any 2 for ₹1,199
                  </p>
                  <p style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f] text-xs mt-1">
                    Free delivery · Mix &amp; match all four
                  </p>
                </motion.div>

                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  href="https://www.instagram.com/auraelement.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "var(--font-body)" }}
                  className="mt-6 flex items-center gap-2.5 text-sm text-[#7a6e5f] hover:text-[#e6c79c] transition-colors"
                >
                  <Instagram size={16} strokeWidth={1.5} />
                  @auraelement.in
                </motion.a>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{ fontFamily: "var(--font-body)" }}
                  className="text-xs tracking-[0.2em] uppercase text-[#7a6e5f] mt-6"
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

// ─── Cart Drawer (With Native Address Checkout Form) ──────────────────────

function CartDrawer() {
  const { state, dispatch, isCartOpen, setIsCartOpen } = useCart();
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
  const deliveryFee = hasItems && pricing.totalQty < 2 ? DELIVERY_FEE : 0;
  const freeDelivery = hasItems && pricing.totalQty >= 2;
  const finalTotal = pricing.grandTotal + deliveryFee;

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

    const options: RazorpayOptions = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: finalTotal * 100,
      currency: "INR",
      name: "Aura Element",
      description: state.items
        .map((i) => `${i.product.title} ×${i.quantity}`)
        .join(", "),
      image: "/favicon.png",
      handler: (response: RazorpaySuccessResponse) => {
        alert(`Payment successful!\nPayment ID: ${response.razorpay_payment_id}`);
        dispatch({ type: "CLEAR" });
        setIsCartOpen(false);
        setShowAddressForm(false);
      },
      prefill: { 
        name: shippingDetails.name,      
        contact: shippingDetails.phone,  
        email: "" 
      },
      notes: {
        "Customer Name": shippingDetails.name,
        "Customer Phone": shippingDetails.phone,
        "Shipping Address": fullAddressString,
        items: state.items
          .map((i) => `${i.product.title} ×${i.quantity}`)
          .join("; "),
        delivery: freeDelivery ? "FREE" : `₹${DELIVERY_FEE}`,
      },
      theme: { color: "#000000" },
      modal: { backdropclose: false, escape: true },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsCartOpen(false)} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30 }} className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div>
                <h2 style={{ fontFamily: "var(--font-display)" }} className="text-xl text-[#111111]">{showAddressForm ? "Shipping Address" : "Your Bag"}</h2>
                <p className="text-xs uppercase text-[#7a6e5f] mt-0.5">{showAddressForm ? "Enter dispatch details" : `${pricing.totalQty} items added`}</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-[#111111]/40"><X size={20} /></button>
            </div>

            {pricing.totalQty >= 2 && !showAddressForm && (
              <div className="bg-[#111111] px-6 py-3 flex items-center gap-3">
                <Tag size={14} className="text-[#e6c79c]" />
                <p className="text-white text-xs">Bundle applied! {pricing.bundlePairs} pairs @ ₹1,199 each</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {state.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <ShoppingBag size={24} className="text-[#e6c79c]" />
                  <p className="text-[#7a6e5f] text-sm">Your bag is empty. Add 2 fragrances → save ₹599</p>
                </div>
              ) : showAddressForm ? (
                <form id="address-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2">
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Full Name *</label><input required type="text" name="name" value={shippingDetails.name} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" /></div>
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Phone Number *</label><input required type="tel" name="phone" value={shippingDetails.phone} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" /></div>
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Address Line 1 *</label><input required type="text" name="addressLine1" value={shippingDetails.addressLine1} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" placeholder="Flat / House No., Street" /></div>
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Address Line 2</label><input type="text" name="addressLine2" value={shippingDetails.addressLine2} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" placeholder="Landmark / Locality" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">City *</label><input required type="text" name="city" value={shippingDetails.city} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" /></div>
                    <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">State *</label><input required type="text" name="state" value={shippingDetails.state} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" /></div>
                  </div>
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#7a6e5f] mb-1">Pincode *</label><input required type="text" name="pincode" value={shippingDetails.pincode} onChange={handleInputChange} className="w-full bg-transparent border-b py-2 text-sm outline-none" /></div>
                </form>
              ) : (
                state.items.map((item: any) => (
                  <div key={item.product.id} className="flex gap-4 py-5 border-b">
                    <div className="w-20 h-24 bg-[#f5f0e8] overflow-hidden"><img src={item.product.main_image_url} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <p style={{ fontFamily: "var(--font-display)" }} className="text-base leading-tight">{item.product.title}</p>
                        <p className="text-[#7a6e5f] text-[11px] mt-0.5">{item.product.volume} · 25% Parfum</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border">
                          <button onClick={() => dispatch({ type: "UPDATE_QTY", id: item.product.id, delta: -1 })} className="w-7 h-7 flex items-center justify-center">-</button>
                          <span className="w-7 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => dispatch({ type: "UPDATE_QTY", id: item.product.id, delta: 1 })} className="w-7 h-7 flex items-center justify-center">+</button>
                        </div>
                        <button onClick={() => dispatch({ type: "REMOVE_ITEM", id: item.product.id })} className="text-xs text-[#7a6e5f]/60">Remove</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {state.items.length > 0 && (
              <div className="border-t px-6 pt-4 pb-7 flex flex-col gap-3">
                <div className="flex justify-between text-sm text-[#7a6e5f]"><span>Subtotal</span><span>₹{pricing.lineSubtotal}</span></div>
                {pricing.bundleDiscount > 0 && <div className="flex justify-between text-sm text-[#e6c79c]"><span>Bundle Discount</span><span>−₹{pricing.bundleDiscount}</span></div>}
                <div className="flex justify-between text-sm text-[#7a6e5f]"><span>Delivery</span><span>{freeDelivery ? "FREE" : `₹${DELIVERY_FEE}`}</span></div>
                <div className="flex justify-between items-baseline border-t pt-3"><span className="text-xs uppercase text-[#7a6e5f]">Total</span><span style={{ fontFamily: "var(--font-display)" }} className="text-2xl text-[#111111]">₹{finalTotal}</span></div>
                
                {!showAddressForm ? (
                  <button onClick={() => setShowAddressForm(true)} className="w-full bg-[#111111] text-white py-4 text-xs uppercase tracking-widest flex items-center justify-center gap-2">Proceed to Checkout <ArrowRight size={15} /></button>
                ) : (
                  <div className="flex gap-3 mt-1">
                    <button type="button" onClick={() => setShowAddressForm(false)} className="w-1/3 border py-4 text-xs uppercase">Back</button>
                    <button type="submit" form="address-checkout-form" disabled={!razorpayReady} className="w-2/3 bg-[#111111] text-white py-4 text-xs uppercase tracking-widest disabled:opacity-60">{razorpayReady ? "Authorize & Pay Now" : "Loading Gateway…"}</button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-[#0a0f1a]" style={{ height: "72vh", minHeight: 480 }}>
      <div className="absolute inset-0"><img src="https://i.postimg.cc/SKmknBDz/Firefly-Gemini-Flash-(3).png" alt="" className="w-full h-full object-cover" /></div>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex flex-col justify-end px-6 sm:px-14 pb-16 z-10">
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-white text-5xl sm:text-7xl leading-tight mb-4">Wear Your<br />Story.</h1>
        <p className="text-white/70 text-sm max-w-sm mb-6">25% oil concentration. Built to last 14 hours.<br />Any 2 bottles — only ₹1,199.</p>
        <button onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#e6c79c] text-[#111111] px-8 py-3.5 text-xs uppercase tracking-widest font-semibold self-start">Shop the Edit</button>
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────

function ProductCard({ product, navigate, index }: { product: Product; navigate: NavigateFn; index: number }) {
  const { dispatch, setIsCartOpen } = useCart();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} className="cursor-pointer group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => navigate("product", product.id)}>
      <div className="relative aspect-[3/4] bg-[#f0ebe0] overflow-hidden">
        <img src={product.main_image_url} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${hovered ? "opacity-0" : "opacity-100"}`} />
        <img src={product.secondary_image_url} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${hovered ? "opacity-100" : "opacity-0"}`} />
        <div className="absolute top-3 left-3 flex flex-col gap-1"><span className="bg-[#111111] text-white text-[9px] uppercase px-2 py-0.5">Sale</span></div>
      </div>
      <div className="pt-3 flex justify-between">
        <div><h3 style={{ fontFamily: "var(--font-display)" }} className="text-base text-[#111111]">{product.title}</h3><p className="text-[11px] text-[#7a6e5f]">{product.tagline}</p></div>
        <div className="text-right"><p className="text-sm font-semibold">₹{product.salePrice}</p><p className="text-xs text-[#7a6e5f] line-through">₹{product.mrpPrice}</p></div>
      </div>
    </motion.div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────

function HomePage({ navigate }: { navigate: NavigateFn }) {
  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HeroSection />
      <section id="collection" className="px-5 sm:px-14 py-20">
        <div className="mb-10"><h2 style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-3xl sm:text-4xl">Launch Collection</h2><p className="text-[#7a6e5f] text-sm mt-1">Add any 2 signatures — automatic bundle offer applied at checkout.</p></div>
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

// ─── Visual Marketing Elements ─────────────────────────────────────────────

function BundleCallout() {
  return (
    <div className="mx-5 sm:mx-14 my-12 bg-[#111111] p-8 sm:p-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div><p className="text-[#e6c79c] text-xs uppercase tracking-widest mb-1">🎁 Exclusive Launch Offer</p><h3 style={{ fontFamily: "var(--font-display)" }} className="text-white text-3xl sm:text-4xl leading-tight">Any 2 Fragrances<br />for just ₹1,199</h3></div>
      <div className="bg-[#e6c79c] text-[#111111] px-6 py-3 font-semibold text-sm tracking-wider uppercase">Best Value Offer ★</div>
    </div>
  );
}

function BrandStrip() {
  const pillars = ["Any 2 for ₹1,199", "25% Oil Concentration", "Hand-Blended Formulas", "Lasts 14–16 Hours"];
  return (
    <div className="border-y bg-[#fafaf8] py-4 overflow-hidden whitespace-nowrap">
      <div className="flex gap-10 justify-center">
        {pillars.map((p, i) => (
          <span key={i} className="text-[10px] uppercase tracking-widest text-[#7a6e5f] font-medium">{p}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Philosophy Teaser ─────────────────────────────────────────────────────

function PhilosophyTeaser({ navigate }: { navigate: NavigateFn }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 bg-[#f5f0e8]">
      <div className="p-8 sm:p-16 flex flex-col justify-center">
        <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl sm:text-4xl mb-4">Scent as Second Skin</h2>
        <p className="text-sm text-[#7a6e5f] leading-relaxed mb-6">Every Aura Element formula is built to interact with your skin, to become something uniquely yours. 25% oil concentration — the highest tier of luxury.</p>
        <button onClick={() => navigate("about")} className="text-xs uppercase tracking-widest font-semibold self-start text-[#111111] hover:text-[#e6c79c]">Our Story →</button>
      </div>
      <div className="h-64 md:h-auto"><img src="https://images.unsplash.com/photo-1779562909409-defc901cf57e?w=800" alt="" className="w-full h-full object-cover" /></div>
    </section>
  );
}

function AboutUsPage() {
  return (
    <div className="min-h-screen pt-32 px-5 max-w-3xl mx-auto text-center">
      <h2 style={{ fontFamily: "var(--font-display)" }} className="text-4xl mb-6 text-[#111111]">Our Story</h2>
      <p className="text-sm text-[#7a6e5f] leading-relaxed mb-4">Aura Element was founded with a single refusal: to make a perfume that disappears before lunch.</p>
      <p className="text-sm text-[#7a6e5f] leading-relaxed">The result is a house built on one promise: what you apply in the morning will still speak for you at midnight.</p>
    </div>
  );
}

// ─── 💡 FIXED: Product Image Gallery Overlays & Centering (Figma Matches) ───

function ProductImageGallery({ images, title, badges, onBack }: { images: string[]; title: string; badges: React.ReactNode; onBack: () => void }) {
  const [active, setActive] = useState(0);

  const handlePrev = () => { setActive((prev) => (prev === 0 ? images.length - 1 : prev - 1)); };
  const handleNext = () => { setActive((prev) => (prev === images.length - 1 ? 0 : prev + 1)); };

  return (
    <div className="flex flex-col bg-[#f5f0e8]">
      <div className="relative w-full overflow-hidden bg-[#f5f0e8] select-none aspect-[1/1] sm:aspect-[3/2]">
        <AnimatePresence mode="wait">
          <motion.img key={active} src={images[active]} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 w-full h-full object-contain p-4 sm:p-8" />
        </AnimatePresence>

        <button onClick={onBack} className="absolute top-4 left-4 z-10 text-[10px] tracking-widest uppercase text-white bg-black/40 px-3 py-2">← Back</button>
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">{badges}</div>

        {/* Floating Arrow Controls Overlaid On Core Display Box */}
        <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/50 text-[#111111] p-2 rounded-full backdrop-blur-sm shadow-sm active:scale-95 transition-transform">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/50 text-[#111111] p-2 rounded-full backdrop-blur-sm shadow-sm active:scale-95 transition-transform">
          <ChevronRight size={18} />
        </button>

        <div className="absolute bottom-4 right-4 z-10 bg-black/40 px-2.5 py-1 text-white text-[11px]">{active + 1} / {images.length}</div>
      </div>

      {/* Centered Miniature Portrait Preview Columns (42px x 52px) */}
      <div className="flex items-center justify-center gap-2 bg-white border-t px-4 py-3" style={{ minHeight: "76px" }}>
        {images.map((src, i) => (
          <button key={i} onClick={() => setActive(i)} className={`relative shrink-0 overflow-hidden rounded-sm transition-all ${active === i ? "ring-2 ring-[#e6c79c] ring-offset-1 opacity-100 scale-105" : "opacity-45"}`} style={{ width: "42px", height: "52px" }}>
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Product Detail Page ────────────────────────────────────────────────────

function ProductDetailPage({ productId, navigate }: { productId: string; navigate: NavigateFn }) {
  const product = PRODUCTS.find((p) => p.id === productId);
  const { dispatch, state, setIsCartOpen } = useCart();
  const [quantity, setQuantity] = useState(1);

  if (!product) return <div className="min-h-screen flex items-center justify-center text-sm pt-32">Product not found.</div>;

  const currentCartQty = state.items.reduce((s, i) => s + i.quantity, 0);
  const previewQty = currentCartQty + quantity;
  const previewPairs = Math.floor(previewQty / 2);
  const previewSingles = previewQty % 2;
  const previewTotal = previewPairs * BUNDLE_PRICE + previewSingles * SALE_PRICE;

  return (
    <div className="min-h-screen pt-32 px-5 sm:px-14">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ProductImageGallery images={product.gallery} title={product.title} badges={<span className="bg-black text-white text-[9px] uppercase px-2 py-0.5">25% Parfum</span>} onBack={() => navigate("home")} />
        <div className="flex flex-col justify-center">
          <span className="text-[#e6c79c] text-xs uppercase tracking-widest mb-1">{product.tagline}</span>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl sm:text-5xl mb-4">{product.title}</h1>
          <div className="flex items-baseline gap-3 mb-6"><span className="text-2xl font-bold">₹{product.salePrice}</span><span className="text-sm text-[#7a6e5f] line-through">₹{product.mrpPrice}</span></div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1.5">-</button>
              <span className="px-3">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-1.5">+</button>
            </div>
            {currentCartQty > 0 && previewPairs > 0 && <span className="text-xs text-[#e6c79c]">Bag total: ₹{previewTotal}</span>}
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => { for(let i=0; i<quantity; i++) dispatch({ type: "ADD_ITEM", product }); setIsCartOpen(true); }} className="w-full border py-4 text-xs uppercase tracking-widest font-semibold hover:bg-black hover:text-white transition-all">Add to Bag</button>
            <button onClick={() => { dispatch({ type: "CLEAR" }); for(let i=0; i<quantity; i++) dispatch({ type: "ADD_ITEM", product }); setIsCartOpen(true); setTimeout(() => { window.dispatchEvent(new CustomEvent("trigger-buy-now")); }, 50); }} className="w-full bg-[#e6c79c] text-[#111111] py-4 text-xs uppercase tracking-widest font-semibold">Buy Now · ₹{product.salePrice * quantity}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactUsPage() {
  return <div className="min-h-screen pt-32 text-center text-sm text-[#7a6e5f]"><h2>Contact Us Page</h2></div>;
}

// ─── ✅ NEW COMPLIANCE LEGAL PAGES VIEW CONTROLLERS ───────────────────────

function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] pt-32 px-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 text-[#e6c79c]"><Truck size={24} /><h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[#111111]">Shipping &amp; Delivery Policy</h1></div>
      <div className="space-y-4 text-sm text-[#7a6e5f] leading-relaxed font-light text-left">
        <p>Thank you for choosing Aura Element. We are dedicated to delivering your fragrances safely and promptly across India.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">1. Dispatch Timelines</h3>
        <p>All orders are processed and dispatched within 24 to 48 working hours from our studio setup in Pune, Maharashtra. Orders are not processed or shipped on Sundays or public holidays.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">2. Shipping Charges</h3>
        <p>We provide Free Express Shipping across India for all orders containing the signature Bundle Offer (above ₹1,199). For individual purchases under ₹1,199, a flat delivery fee of ₹70 is applied at checkout.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">3. Transit Sillage</h3>
        <p>Metro cities typically receive delivery within 3–5 business days post-dispatch, while tier-2 and rural regions may require 5–7 business days.</p>
      </div>
    </div>
  );
}

function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] pt-32 px-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 text-[#e6c79c]"><RotateCcw size={24} /><h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[#111111]">Cancellation &amp; Refund Policy</h1></div>
      <div className="space-y-4 text-sm text-[#7a6e5f] leading-relaxed font-light text-left">
        <p>Our baseline formulation philosophy prioritizes meticulous hand-blending standards. Due to the personal care nature of luxury items, refunds are tightly regulated.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">1. Damaged or Faulty Arrivals</h3>
        <p>In the rare event that your luxury bottle arrives damaged, leaking, or with a faulty atomization pump infrastructure, we will issue a direct replacement immediately. Please email an unboxing video to support@auraelement.in within 48 hours of transit unpacking.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">2. Cancellations</h3>
        <p>Orders can be cancelled directly through your support window within 12 hours of payment routing sequence, prior to automated warehouse fulfillment dispatch loops.</p>
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] pt-32 px-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 text-[#e6c79c]"><ShieldCheck size={24} /><h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold text-[#111111]">Privacy &amp; Data Protection Policy</h1></div>
      <div className="space-y-4 text-sm text-[#7a6e5f] leading-relaxed font-light text-left">
        <p>Aura Element respects the architectural integrity of your personal information. We maintain bank-grade security protocols to protect your data profile transactions.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">1. Data Capture Infrastructure</h3>
        <p>We process client information properties strictly to establish secure, localized verification contexts for customer shipment routing records.</p>
        <h3 className="text-base font-semibold text-[#111111] pt-2">2. Payment Routing Safety</h3>
        <p>Your address structures and numeric metrics are parsed strictly for Razorpay token operations. We never store credit card cvvs, personal financial properties, or sell tracking logs to outbound data layers.</p>
      </div>
    </div>
  );
}

// ─── Footer with Dynamic Link Hooks ─────────────────────────────────────────

function Footer({ navigate }: { navigate: NavigateFn }) {
  return (
    <footer className="border-t border-[#111111]/10 px-5 sm:px-8 lg:px-14 py-12 bg-[#fafaf8]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10 text-left">
        <div>
          <button onClick={() => navigate("home")} style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-2xl tracking-widest uppercase block mb-3">Aura Element</button>
          <p className="text-[#7a6e5f] text-sm font-light max-w-[210px]">Parfum grade fragrances for those who live with intention.</p>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#e6c79c] mb-4">Navigate</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate("home")} className="text-left text-sm text-[#7a6e5f] hover:text-[#e6c79c]">Shop Collection</button>
            <button onClick={() => navigate("about")} className="text-left text-sm text-[#7a6e5f] hover:text-[#e6c79c]">Our Creative Story</button>
          </div>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#e6c79c] mb-4">Customer Care &amp; Compliance</p>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => navigate("shipping-policy")} className="text-left text-sm text-[#7a6e5f] hover:text-[#e6c79c]">Shipping &amp; Delivery</button>
            <button onClick={() => navigate("refund-policy")} className="text-left text-sm text-[#7a6e5f] hover:text-[#e6c79c]">Cancellations &amp; Refunds</button>
            <button onClick={() => navigate("privacy-policy")} className="text-left text-sm text-[#7a6e5f] hover:text-[#e6c79c]">Privacy Statement</button>
          </div>
        </div>
      </div>
      <div className="border-t border-[#111111]/8 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#7a6e5f]">
        <p>© {new Date().getFullYear()} Aura Element. All rights reserved.</p>
        <p>Crafted with intention · Pune, India</p>
      </div>
    </footer>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────

export default function App() {
  const [cartState, cartDispatch] = useReducer(cartReducer, { items: [] });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const navigate: NavigateFn = useCallback((to, productId) => {
    setPage(to);
    if (productId) setSelectedProductId(productId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  return (
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
        <AnnouncementBar />
        <Navbar navigate={navigate} currentPage={page} />
        <CartDrawer />

        <AnimatePresence mode="wait">
          {page === "home" && <HomePage key="home" navigate={navigate} />}
          {page === "product" && selectedProductId && (
            <ProductDetailPage
              key={selectedProductId}
              productId={selectedProductId}
              navigate={navigate}
            />
          )}
          {page === "about" && <AboutUsPage key="about" />}
          {page === "contact" && <ContactUsPage key="contact" />}
          {page === "shipping-policy" && <ShippingPolicyPage />}
          {page === "privacy-policy" && <PrivacyPolicyPage />}
          {page === "refund-policy" && <RefundPolicyPage />}
        </AnimatePresence>
      </div>
    </CartContext.Provider>
  );
}
