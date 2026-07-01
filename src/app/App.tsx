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

// ─── Self-Contained Supabase Client Initialization (Fixes Vercel Errors) ───
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      
    autoRefreshToken: true,    
    detectSessionInUrl: true,  
  },
});

const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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
  if (error) { console.error("fetchUserOrders error stack:", error.message); return []; }
  return (data as Order[]) ?? [];
}

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

// ─── OPTIMIZED PRICING ARCHITECTURE (₹1,199 Offer) ───────────────────────
const BUNDLE_PRICE = 1199;[cite: 3]
const SALE_PRICE = 799;[cite: 3]
const DELIVERY_FEE = 70;[cite: 3]

interface BundlePricing {
  lineSubtotal: number;
  bundlePairs: number;
  bundleDiscount: number;
  grandTotal: number;
  totalQty: number;
  youSave: number;
}

function computeBundlePricing(items: CartItem[]): BundlePricing {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);[cite: 3]
  const lineSubtotal = items.reduce((s, i) => s + i.product.salePrice * i.quantity, 0);[cite: 3]
  const bundlePairs = Math.floor(totalQty / 2);[cite: 3]
  const singles = totalQty % 2;[cite: 3]
  const grandTotal = bundlePairs * BUNDLE_PRICE + singles * SALE_PRICE;[cite: 3]
  const bundleDiscount = bundlePairs > 0 ? lineSubtotal - grandTotal : 0;[cite: 3]
  const mrpTotal = items.reduce((s, i) => s + i.product.mrpPrice * i.quantity, 0);[cite: 3]
  const youSave = mrpTotal - grandTotal;[cite: 3]
  return { lineSubtotal, bundlePairs, bundleDiscount, grandTotal, totalQty, youSave };[cite: 3]
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "ocean-rush",
    title: "Ocean Rush",
    tagline: "Tides of Confidence",
    mrpPrice: 1199,
    salePrice: 799,
    description: "A crisp, electric fusion of Bergamot, Lavender, and Cedarwood. Ocean Rush is a high-persistence apparel perfume designed to bond with fabric fibers for a powerful, sophisticated aura that lasts. Fresh and commanding.",
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
    notes: { top: ["Lavender", "Bergamot", "Pink Pepper"], heart: ["Violet Leaf", "Water Lily", "Jasmine"], base: ["Musk", "Cedar", "Moss"] },
    volume: "50ml",
  },
  {
    id: "2",
    slug: "primal-storm",
    title: "Primal Storm",
    tagline: "Raw. Unfiltered. Unafraid.",
    mrpPrice: 1199,
    salePrice: 799,
    description: "An intense, aromatic woody fusion with a fresh spicy bite. A bold apparel perfume engineered for maximum sillage and raw energy on fabric.",
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
    notes: { top: ["Italian Bergamot ", "Pink Perpper", "Lavender"], heart: ["Vetiver Haiti", "Geranium Egypt", "Sichuan Pepper"], base: ["Patchouli", "Cedarwood", "Madagascar"] },
    volume: "50ml",
  },
  {
    id: "3",
    slug: "velvet-blossom",
    title: "Velvet Blossom",
    tagline: "Softness is Strength",
    mrpPrice: 1199,
    salePrice: 799,
    description: "An elegant, sweet embrace of Pear Blossom, Red Berries, and Italian Mandarin. Velvet Blossom is a high-persistence apparel perfume that leaves a sophisticated, soft, and undeniable trail.",
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
    notes: { top: ["Pear Blossom", "Red Berries", "Italian Mandarin"], heart: ["White Gardenia", "Jasmine Absolute", "Frangipani"], base: ["Brown Sugar", "Patchouli", "Musk"] },
    volume: "50ml",
  },
  {
    id: "4",
    slug: "rio-glow",
    title: "Rio Glow",
    tagline: "Golden Hour, Bottled",
    mrpPrice: 1199,
    salePrice: 799,
    description: "A vibrant, tropical escape featuring Passionfruit, Pineapple, and Vanilla Orchid. Rio Glow is an exotic unisex apparel perfume that captures the warmth of a summer sunset. Fresh, fruity, and undeniably radiant.",
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
    notes: { top: ["Passionfruit", "Grapefruit", "Pineapple"], heart: ["Peony", "Vanilla Orchid", "Jasmine"], base: ["Musk", "Woody", "Oakmoss"] },
    volume: "50ml",
  },
];

const MARQUEE_TEXT = "BUY ANY 2 FOR ONLY ₹1,199  ·  25% OIL CONCENTRATION SIGNATURE  ·  FREE SHIPPING ABOVE ₹1,199  ·  HANDCRAFTED PARFUM GRADE  ·  ";[cite: 3]

function AnnouncementBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-8 sm:h-9 bg-black flex items-center overflow-hidden select-none">
      <motion.div animate={{ x: "-50%" }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }} className="flex shrink-0 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <span key={copy} style={{ fontFamily: "var(--font-body)" }} className="inline-flex items-center text-white text-[9px] sm:text-[10px] tracking-[0.32em] uppercase shrink-0">
            {MARQUEE_TEXT}
            {MARQUEE_TEXT}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function Navbar({ navigate, currentPage }: { navigate: NavigateFn; currentPage: Page }) {
  const { state, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);[cite: 3]

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

  return (
    <>
      <header className={`fixed left-0 right-0 z-30 transition-all duration-500 ${scrolled ? "bg-white/96 backdrop-blur-md border-b border-[#e6c79c]/40" : "bg-transparent"}`} style={{ top: "32px" }}>
        <div className="flex items-center justify-between px-5 sm:px-8 lg:px-14 h-16 sm:h-20">
          <button onClick={() => handleNav("home")} style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-xl sm:text-2xl tracking-widest uppercase select-none">
            Aura Element
          </button>

          <nav className="hidden md:flex items-center gap-10">
            {[{ label: "Shop", page: "home" }, { label: "Our Story", page: "about" }, { label: "Contact", page: "contact" }].map(({ label, page }) => (
              <button key={page} onClick={() => handleNav(page as Page)} style={{ fontFamily: "var(--font-body)" }} className={`text-sm tracking-[0.15em] uppercase transition-colors duration-200 ${currentPage === page ? "text-[#e6c79c]" : "text-[#111111] hover:text-[#e6c79c]"}`}>
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setIsCartOpen(true)} className="relative text-[#111111] hover:text-[#e6c79c] transition-colors duration-200 p-1">
              <ShoppingBag size={22} strokeWidth={1.5} />
              {totalItems > 0 && <motion.span key={totalItems} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-[#e6c79c] text-[#111111] text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center leading-none">{totalItems}</motion.span>}
            </button>

            {user ? (
              <div ref={profileRef} className="relative hidden md:block">
                <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 hover:text-[#e6c79c] transition-colors group">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e6c79c]/50">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <ChevronDown size={14} className={`text-[#111111]/50 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-full mt-3 w-56 bg-white border shadow-xl z-50">
                      <div className="px-4 py-3 border-b">
                        <p style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-base truncate">{user.name}</p>
                        <p style={{ fontFamily: "var(--font-body)" }} className="text-[#7a6e5f] text-xs truncate mt-0.5">{user.email}</p>
                      </div>
                      <button onClick={() => handleNav("account")} style={{ fontFamily: "var(--font-body)" }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#7a6e5f] hover:text-[#111111] hover:bg-[#f5f0e8] transition-colors">
                        <User size={14} /> My Portal
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={() => handleNav("auth")} style={{ fontFamily: "var(--font-body)" }} className="hidden md:flex items-center gap-2 text-sm tracking-[0.12em] uppercase text-[#111111] hover:text-[#e6c79c] transition-colors">
                <User size={17} strokeWidth={1.5} /> Sign In
              </button>
            )}

            <button className="md:hidden text-[#111111] hover:text-[#e6c79c] transition-colors p-1" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 h-full w-4/5 max-w-xs bg-white z-30 md:hidden flex flex-col pt-8 px-8" style={{ top: 0 }}>
              <div className="pt-14 sm:pt-16">
                <div className="absolute top-0 left-0 right-0 h-8 bg-black" />
                {links.map(({ label, page }) => (
                  <button key={page} onClick={() => handleNav(page as Page)} style={{ fontFamily: "var(--font-display)" }} className={`text-left text-2xl py-5 border-b w-full ${currentPage === page ? "text-[#e6c79c]" : "text-[#111111]"}`}>{label}</button>
                ))}
                <div className="mt-8 p-4 bg-[#111111]">
                  <p className="text-[#e6c79c] text-xs uppercase tracking-widest">🎁 Bundle Offer</p>
                  <p style={{ fontFamily: "var(--font-display)" }} className="text-white text-xl mt-1">Any 2 for ₹1,199</p>[cite: 3]
                </div>
                {user ? (
                  <div className="mt-8 flex items-center gap-3 border-t pt-6">
                    <img src={user.avatar} alt="" className="w-9 h-9 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] truncate">{user.name}</p>
                      <button onClick={() => handleNav("account")} className="text-xs text-[#7a6e5f] flex items-center gap-1"><User size={11} /> My Portal</button>[cite: 3]
                    </div>
                  </div>
                ) : (
                  <button onClick={() => handleNav("auth")} className="mt-6 w-full border py-3.5 text-xs uppercase tracking-widest flex items-center justify-center gap-2"><User size={15} /> Sign In</button>[cite: 3]
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
  const [shippingDetails, setShippingDetails] = useState({ name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });

  const pricing = computeBundlePricing(state.items);[cite: 3]
  const hasItems = state.items.length > 0;[cite: 3]
  const finalTotal = pricing.grandTotal + (hasItems ? DELIVERY_FEE : 0);[cite: 3]

  useEffect(() => {
    if (document.getElementById("razorpay-sdk")) { setRazorpayReady(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const handleBuyNowTrigger = () => { setShowAddressForm(true); };
    window.addEventListener("trigger-buy-now", handleBuyNowTrigger);
    return () => window.removeEventListener("trigger-buy-now", handleBuyNowTrigger);
  }, []);

  useEffect(() => { if (!isCartOpen) setShowAddressForm(false); }, [isCartOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.Razorpay) { alert("Gateway still initializing."); return; }

    const fullAddressString = `${shippingDetails.addressLine1}, ${shippingDetails.addressLine2 ? shippingDetails.addressLine2 + ", " : ""}${shippingDetails.city}, ${shippingDetails.state} - ${shippingDetails.pincode}`;
    const trackingSummary = state.items.map((i: any) => `${i.product.title} × ${i.quantity}`).join(", ");[cite: 3]
    const parsedItems = state.items.map((i: any) => ({ product_id: i.product.id, title: i.product.title, quantity: i.quantity, price: i.product.salePrice }));[cite: 3]

    const options: RazorpayOptions = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: finalTotal * 100,
      currency: "INR",
      name: "Aura Element",
      description: trackingSummary,
      image: "/favicon.png",
      handler: async (response: RazorpaySuccessResponse) => {
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
          console.error("Database bypass logging:", dbErr);
        }

        alert(`Payment successful!\nID: ${response.razorpay_payment_id}`);
        dispatch({ type: "CLEAR" });
        setIsCartOpen(false);
      },
      prefill: { name: shippingDetails.name, contact: shippingDetails.phone, email: user?.email || "" },
      notes: { "Shipping Address": fullAddressString, items: trackingSummary },
      theme: { color: "#000000" }
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
                <p className="text-xs uppercase text-[#7a6e5f] mt-0.5">{showAddressForm ? "Enter dispatch details" : `${pricing.totalQty} items added`}</p>[cite: 3]
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-[#111111]/40"><X size={20} /></button>
            </div>

            {pricing.totalQty >= 2 && !showAddressForm && ([cite: 3]
              <div className="bg-[#111111] px-6 py-3 flex items-center gap-3">
                <Tag size={14} className="text-[#e6c79c]" />
                <p className="text-white text-xs">Bundle applied! {pricing.bundlePairs} pairs @ ₹1,199 each</p>[cite: 3]
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {state.items.length === 0 ? ([cite: 3]
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
                state.items.map((item: any) => ([cite: 3]
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
                        <button onClick={() => dispatch({ type: "REMOVE_ITEM", id: item.product.id })} className="text-xs text-[#7a6e5f]/60">Remove</button>[cite: 3]
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {state.items.length > 0 && ([cite: 3]
              <div className="border-t px-6 pt-4 pb-7 flex flex-col gap-3">
                <div className="flex justify-between text-sm text-[#7a6e5f]"><span>Subtotal</span><span>₹{pricing.lineSubtotal}</span></div>[cite: 3]
                {pricing.bundleDiscount > 0 && <div className="flex justify-between text-sm text-[#e6c79c]"><span>Bundle Discount</span><span>−₹{pricing.bundleDiscount}</span></div>}[cite: 3]
                <div className="flex justify-between text-sm text-[#7a6e5f]"><span>Delivery</span><span>₹{DELIVERY_FEE}</span></div>[cite: 3]
                <div className="flex justify-between items-baseline border-t pt-3"><span className="text-xs uppercase text-[#7a6e5f]">Total</span><span style={{ fontFamily: "var(--font-display)" }} className="text-2xl text-[#111111]">₹{finalTotal}</span></div>[cite: 3]
                
                {!showAddressForm ? (
                  <button onClick={() => setShowAddressForm(true)} className="w-full bg-[#111111] text-white py-4 text-xs uppercase tracking-widest flex items-center justify-center gap-2">Proceed to Checkout <ArrowRight size={15} /></button>[cite: 3]
                ) : (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowAddressForm(false)} className="w-1/3 border py-4 text-xs uppercase">Back</button>[cite: 3]
                    <button type="submit" form="address-checkout-form" disabled={!razorpayReady} className="w-2/3 bg-[#111111] text-white py-4 text-xs uppercase tracking-widest disabled:opacity-60">{razorpayReady ? "Authorize & Pay Now" : "Loading Gateway…"}</button>[cite: 3]
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
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-white text-5xl sm:text-7xl leading-tight mb-4">Wear Your<br />Story.</h1>[cite: 3]
        <p className="text-white/70 text-sm max-w-sm mb-6">25% oil concentration. Built to last 14 hours.<br />Any 2 bottles — only ₹1,199.</p>[cite: 3]
        <button onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#e6c79c] text-[#111111] px-8 py-3.5 text-xs uppercase tracking-widest font-semibold self-start">Shop the Edit</button>[cite: 3]
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
        <div className="absolute top-3 left-3 flex flex-col gap-1"><span className="bg-[#111111] text-white text-[9px] uppercase px-2 py-0.5">Sale</span></div>[cite: 3]
      </div>
      <div className="pt-3 flex justify-between">
        <div><h3 style={{ fontFamily: "var(--font-display)" }} className="text-base text-[#111111]">{product.title}</h3><p className="text-[11px] text-[#7a6e5f]">{product.tagline}</p></div>[cite: 3]
        <div className="text-right"><p className="text-sm font-semibold">₹{product.salePrice}</p><p className="text-xs text-[#7a6e5f] line-through">₹{product.mrpPrice}</p></div>[cite: 3]
      </div>
    </motion.div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────

function HomePage({ navigate }: { navigate: NavigateFn }) {
  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HeroSection />[cite: 3]
      <section id="collection" className="px-5 sm:px-14 py-20">
        <div className="mb-10"><h2 style={{ fontFamily: "var(--font-display)" }} className="text-[#111111] text-3xl sm:text-4xl">Launch Collection</h2><p className="text-[#7a6e5f] text-sm mt-1">Add any 2 signatures — automatic bundle offer applied at checkout.</p></div>[cite: 3]
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRODUCTS.map((product, i) => ([cite: 3]
            <ProductCard key={product.id} product={product} navigate={navigate} index={i} />[cite: 3]
          ))}
        </div>
      </section>
      <BundleCallout />[cite: 3]
      <BrandStrip />[cite: 3]
      <PhilosophyTeaser navigate={navigate} />[cite: 3]
      <Footer navigate={navigate} />[cite: 3]
    </motion.div>
  );
}

function BundleCallout() {
  return (
    <div className="mx-5 sm:mx-14 my-12 bg-[#111111] p-8 sm:p-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div><p className="text-[#e6c79c] text-xs uppercase tracking-widest mb-1">🎁 Exclusive Launch Offer</p><h3 style={{ fontFamily: "var(--font-display)" }} className="text-white text-3xl sm:text-4xl leading-tight">Any 2 Fragrances<br />for just ₹1,199</h3></div>[cite: 3]
      <div className="bg-[#e6c79c] text-[#111111] px-6 py-3 font-semibold text-sm tracking-wider uppercase">Best Value Offer ★</div>[cite: 3]
    </div>
  );
}

function BrandStrip() {
  const pillars = ["Any 2 for ₹1,199", "25% Oil Concentration", "Hand-Blended Formulas", "Lasts 14–16 Hours"];[cite: 3]
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

function PhilosophyTeaser({ navigate }: { navigate: NavigateFn }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 bg-[#f5f0e8]">
      <div className="p-8 sm:p-16 flex flex-col justify-center">
        <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl sm:text-4xl mb-4">Scent as Second Skin</h2>[cite: 3]
        <p className="text-sm text-[#7a6e5f] leading-relaxed mb-6">Every Aura Element formula is built to interact with your skin, to become something uniquely yours. 25% oil concentration — the highest tier of luxury.</p>[cite: 3]
        <button onClick={() => navigate("about")} className="text-xs uppercase tracking-widest font-semibold self-start text-[#111111] hover:text-[#e6c79c]">Our Story →</button>[cite: 3]
      </div>
      <div className="h-64 md:h-auto"><img src="https://images.unsplash.com/photo-1779562909409-defc901cf57e?w=800" alt="" className="w-full h-full object-cover" /></div>[cite: 3]
    </section>
  );
}

function AboutUsPage() {
  return <div className="min-h-screen pt-32 text-center text-sm text-[#7a6e5f]"><h2>Our Story Page</h2></div>;[cite: 3]
}

// ─── 💡 FIXED: Product Image Gallery Overlays & Center Alignment ──────────

function ProductImageGallery({ images, title, badges, onBack }: { images: string[]; title: string; badges: React.ReactNode; onBack: () => void }) {
  const [active, setActive] = useState(0);

  const handlePrev = () => { setActive((prev) => (prev === 0 ? images.length - 1 : prev - 1)); };[cite: 3]
  const handleNext = () => { setActive((prev) => (prev === images.length - 1 ? 0 : prev + 1)); };[cite: 3]

  return (
    <div className="flex flex-col bg-[#f5f0e8]">
      <div className="relative w-full overflow-hidden bg-[#f5f0e8] select-none aspect-[1/1] sm:aspect-[3/2]">
        <AnimatePresence mode="wait">
          <motion.img key={active} src={images[active]} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 w-full h-full object-contain p-4 sm:p-8" />[cite: 3]
        </AnimatePresence>

        <button onClick={onBack} className="absolute top-4 left-4 z-10 text-[10px] tracking-widest uppercase text-white bg-black/40 px-3 py-2">← Back</button>[cite: 3]
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">{badges}</div>[cite: 3]

        {/* Floating Arrow Controls */}
        <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/50 text-[#111111] p-2 rounded-full backdrop-blur-sm shadow-sm">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/50 text-[#111111] p-2 rounded-full backdrop-blur-sm shadow-sm">
          <ChevronRight size={18} />
        </button>

        <div className="absolute bottom-4 right-4 z-10 bg-black/40 px-2.5 py-1 text-white text-[11px]">{active + 1} / {images.length}</div>[cite: 3]
      </div>

      {/* Center Aligned Portrait Micro-Thumbnails */}
      <div className="flex items-center justify-center gap-2 bg-white border-t px-4 py-3" style={{ minHeight: "76px" }}>
        {images.map((src, i) => (
          <button key={i} onClick={() => setActive(i)} className={`relative shrink-0 overflow-hidden rounded-sm transition-all ${active === i ? "ring-2 ring-[#e6c79c] ring-offset-1 opacity-100 scale-105" : "opacity-45"}`} style={{ width: "42px", height: "52px" }}>[cite: 3]
            <img src={src} alt="" className="w-full h-full object-cover" />[cite: 3]
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Product Detail Page ────────────────────────────────────────────────────

function ProductDetailPage({ productId, navigate }: { productId: string; navigate: NavigateFn }) {
  const product = PRODUCTS.find((p) => p.id === productId);[cite: 3]
  const { dispatch, state, setIsCartOpen } = useCart();[cite: 3]
  const [quantity, setQuantity] = useState(1);[cite: 3]

  if (!product) return <div className="min-h-screen flex items-center justify-center text-sm pt-32">Product not found.</div>;[cite: 3]

  const currentCartQty = state.items.reduce((s: number, i: any) => s + i.quantity, 0);[cite: 3]
  const previewQty = currentCartQty + quantity;[cite: 3]
  const previewPairs = Math.floor(previewQty / 2);[cite: 3]
  const previewSingles = previewQty % 2;[cite: 3]
  const previewTotal = previewPairs * BUNDLE_PRICE + previewSingles * SALE_PRICE;[cite: 3]

  return (
    <div className="min-h-screen pt-32 px-5 sm:px-14">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ProductImageGallery images={product.gallery} title={product.title} badges={<span className="bg-black text-white text-[9px] uppercase px-2 py-0.5">25% Parfum</span>} onBack={() => navigate("home")} />[cite: 3]
        <div className="flex flex-col justify-center">
          <span className="text-[#e6c79c] text-xs uppercase tracking-widest mb-1">{product.tagline}</span>[cite: 3]
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl sm:text-5xl mb-4">{product.title}</h1>[cite: 3]
          <div className="flex items-baseline gap-3 mb-6"><span className="text-2xl font-bold">₹{product.salePrice}</span><span className="text-sm text-[#7a6e5f] line-through">₹{product.mrpPrice}</span></div>[cite: 3]
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1.5">-</button>[cite: 3]
              <span className="px-3">{quantity}</span>[cite: 3]
              <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-1.5">+</button>[cite: 3]
            </div>
            {currentCartQty > 0 && previewPairs > 0 && <span className="text-xs text-[#e6c79c]">Bag total: ₹{previewTotal}</span>}[cite: 3]
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => { for(let i=0; i<quantity; i++) dispatch({ type: "ADD_ITEM", product }); setIsCartOpen(true); }} className="w-full border py-4 text-xs uppercase tracking-widest font-semibold hover:bg-black hover:text-white transition-all">Add to Bag</button>[cite: 3]
            <button onClick={() => { dispatch({ type: "CLEAR" }); for(let i=0; i<quantity; i++) dispatch({ type: "ADD_ITEM", product }); setIsCartOpen(true); setTimeout(() => { window.dispatchEvent(new CustomEvent("trigger-buy-now")); }, 50); }} className="w-full bg-[#e6c79c] text-[#111111] py-4 text-xs uppercase tracking-widest font-semibold">Buy Now · ₹{product.salePrice * quantity}</button>[cite: 3]
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactUsPage() {
  return <div className="min-h-screen pt-32 text-center text-sm text-[#7a6e5f]"><h2>Contact Us Page</h2></div>;[cite: 3]
}

function Footer({ navigate }: { navigate: NavigateFn }) {
  return <footer className="border-t p-12 bg-[#fafaf8] text-center text-xs text-[#7a6e5f]"><p>© {new Date().getFullYear()} Aura Element. Crafted with intention in Pune, India.</p></footer>;[cite: 3]
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

function AuthPage({ navigate }: { navigate: NavigateFn }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);[cite: 3]
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });[cite: 3]
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf8] pt-20 px-5">
      <div className="max-w-md w-full bg-white border p-8 text-center">
        <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl mb-2">Welcome to the Club.</h2>[cite: 3]
        <p className="text-sm text-[#7a6e5f] mb-6">Sign in with Google Secure Auth to track orders and manage your account.</p>[cite: 3]
        <button onClick={handleGoogleAuth} disabled={loading} className="w-full bg-[#111111] text-white py-4 text-sm uppercase tracking-widest disabled:opacity-50">{loading ? "Connecting…" : "Continue with Google"}</button>[cite: 3]
      </div>
    </div>
  );
}

// ─── Account / Order History Page ────────────────────────────────────────────

function AccountPage({ navigate }: { navigate: NavigateFn }) {
  const { user, orders, setOrders, setUser } = useAuth();[cite: 3]
  const [loading, setLoading] = useState(true);[cite: 3]

  useEffect(() => {
    if (!user) { navigate("auth"); return; }[cite: 3]
    setLoading(true);[cite: 3]
    fetchUserOrders(user.id).then((data) => { setOrders(data); setLoading(false); });[cite: 3]
  }, [user]);

  if (!user) return null;[cite: 3]

  return (
    <div className="min-h-screen bg-[#fafaf8] px-5 sm:px-14 pt-32 pb-16">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <div className="bg-white border p-6 text-center h-fit">
          <img src={user.avatar} alt="" className="w-16 h-16 rounded-full mx-auto mb-3" />[cite: 3]
          <h3 style={{ fontFamily: "var(--font-display)" }} className="text-xl">{user.name}</h3>[cite: 3]
          <p className="text-xs text-[#7a6e5f] mb-6 break-all">{user.email}</p>[cite: 3]
          <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setOrders([]); navigate("home"); }} className="w-full border py-2 text-xs uppercase text-red-400">Sign Out</button>[cite: 3]
        </div>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-2xl mb-6">Your Orders</h2>[cite: 3]
          {loading ? <p className="text-xs text-[#7a6e5f]">Loading historical records...</p> : orders.length === 0 ? <p className="text-xs text-[#7a6e5f]">No past purchase records found.</p> : ([cite: 3]
            <div className="space-y-4">
              {orders.map((ord) => ([cite: 3]
                <div key={ord.id} className="bg-white border p-5">
                  <div className="flex justify-between border-b pb-2 mb-2 text-xs text-[#7a6e5f] font-mono"><span>ID: #{ord.id.slice(0,8).toUpperCase()}</span><span className="uppercase text-green-600">Paid</span></div>[cite: 3]
                  {ord.items.map((i, idx) => <p key={idx} style={{ fontFamily: "var(--font-display)" }} className="text-lg">{i.title} × {i.quantity}</p>)}[cite: 3]
                  <div className="flex justify-between border-t pt-2 mt-3 text-xs"><span>Settled Amount</span><span className="font-bold">₹{ord.total}</span></div>[cite: 3]
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App Context Providers Wrapper ──────────────────────────────────────────

const CartDrawerContext = createContext<any>(null);
const AuthContextWrapper = createContext<any>(null);

export default function App() {
  const [cartState, cartDispatch] = useReducer(cartReducer, { items: [] });[cite: 3]
  const [isCartOpen, setIsCartOpen] = useState(false);[cite: 3]
  const [page, setPage] = useState<Page>("home");[cite: 3]
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);[cite: 3]
  const [user, setUser] = useState<AuthUser | null>(null);[cite: 3]
  const [orders, setOrders] = useState<Order[]>([]);[cite: 3]

  useEffect(() => {
    const mapSession = (u: any): AuthUser => ({
      id: u.id,
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Aura Member",
      email: u.email ?? "",
      avatar: u.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80",
      method: "google",
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(mapSession(session.user)); fetchUserOrders(session.user.id).then(setOrders); }[cite: 3]
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(mapSession(session.user));[cite: 3]
        fetchUserOrders(session.user.id).then(setOrders);[cite: 3]
        if (event === "SIGNED_IN") setPage("account");[cite: 3]
      } else {
        setUser(null);[cite: 3]
        setOrders([]);[cite: 3]
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate: NavigateFn = useCallback((to, productId) => {
    if (to === "auth" && user) { setPage("account"); } else { setPage(to); }[cite: 3]
    if (productId) setSelectedProductId(productId);[cite: 3]
    window.scrollTo({ top: 0, behavior: "smooth" });[cite: 3]
  }, [user]);

  useEffect(() => { document.body.style.overflow = isCartOpen ? "hidden" : ""; }, [isCartOpen]);[cite: 3]

  const isAuthPage = page === "auth";[cite: 3]

  return (
    <AuthContext.Provider value={{ user, setUser, orders, setOrders }}>[cite: 3]
      <CartContext.Provider value={{ state: cartState, dispatch: cartDispatch, isCartOpen, setIsCartOpen }}>[cite: 3]
        <div style={{ fontFamily: "var(--font-body)" }} className="bg-white text-[#111111] min-h-screen">[cite: 3]
          {!isAuthPage && <AnnouncementBar />}[cite: 3]
          {!isAuthPage && <Navbar navigate={navigate} currentPage={page} />}[cite: 3]
          {!isAuthPage && <CartDrawer />}[cite: 3]

          <AnimatePresence mode="wait">[cite: 3]
            {page === "home" && <HomePage key="home" navigate={navigate} />}[cite: 3]
            {page === "product" && selectedProductId && <ProductDetailPage key={selectedProductId} productId={selectedProductId} navigate={navigate} />}[cite: 3]
            {page === "about" && <AboutUsPage />}[cite: 3]
            {page === "contact" && <ContactUsPage />}[cite: 3]
            {page === "auth" && <AuthPage navigate={navigate} />}[cite: 3]
            {page === "account" && <AccountPage navigate={navigate} />}[cite: 3]
          </AnimatePresence>[cite: 3]
        </div>[cite: 3]
      </CartContext.Provider>[cite: 3]
    </AuthContext.Provider>[cite: 3]
  );
}
