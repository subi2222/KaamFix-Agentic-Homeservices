import React, { useState, Suspense } from "react";
import {
  Wrench,
  Sun,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  ArrowRight,
  Award,
  Zap,
  Shield,
  Clock,
  MapPin,
  Users,
  Droplets,
  Wind,
  Hammer,
  Paintbrush,
  Check,
  Search,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  Camera,
  SunMedium,
  CheckCircle,
  Layers,
  BadgeCheck,
  Phone,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AuthModal from "./AuthModal";

interface AuthProps {
  onAuthSuccess: (uid: string, role: string, name: string) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

interface ServiceCategory {
  id: string;
  name: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  price: string;
  dispatchTime: string;
  desc: string;
  popularJobs: string[];
  iconBg: string;
  accentColor: string;
}

const CATEGORIES_DATA: ServiceCategory[] = [
  {
    id: "electrician",
    name: "Electrician",
    tag: "electrical",
    icon: Zap,
    badge: "High Demand",
    price: "From Rs. 850",
    dispatchTime: "20-30 mins",
    desc: "Short circuits, DB breaker panels, generator changeovers & smart home wiring.",
    popularJobs: ["Short Circuit Tracing", "DB Breaker Tripping", "UPS & Generator Switch", "Ceiling Fan & Light Fitting"],
    iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    accentColor: "hover:border-emerald-500/50"
  },
  {
    id: "plumber",
    name: "Plumber & Sanitary",
    tag: "plumbing",
    icon: Droplets,
    badge: "24/7 Available",
    price: "From Rs. 750",
    dispatchTime: "25-35 mins",
    desc: "Underground pipe leaks, sanitary installations, water pumps & geyser fittings.",
    popularJobs: ["Concealed Pipe Leaks", "Water Motor Repair", "Geyser Gas & Electric", "Drain Clog Removal"],
    iconBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    accentColor: "hover:border-teal-500/50"
  },
  {
    id: "ac",
    name: "AC & HVAC Tech",
    tag: "cooling",
    icon: Wind,
    badge: "Seasonal Peak",
    price: "From Rs. 1,500",
    dispatchTime: "30-40 mins",
    desc: "DC inverter master servicing, chemical wash, gas refill & PCB circuit repair.",
    popularJobs: ["Inverter Gas Refilling", "Chemical Master Wash", "Outdoor PCB Board Fix", "Compressor Diagnostic"],
    iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    accentColor: "hover:border-sky-500/50"
  },
  {
    id: "carpenter",
    name: "Carpenter",
    tag: "woodwork",
    icon: Hammer,
    badge: "Custom Finish",
    price: "From Rs. 950",
    dispatchTime: "35-45 mins",
    desc: "Modular kitchens, wardrobe repairs, door locks, hinges & furniture polish.",
    popularJobs: ["Door Lock & Hydraulic Hinges", "Kitchen Cabinet Drawer Fix", "Wardrobe Custom Shelving", "Furniture Hardwood Polish"],
    iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accentColor: "hover:border-amber-500/50"
  },
  {
    id: "painter",
    name: "Painter & Seepage",
    tag: "renovation",
    icon: Paintbrush,
    badge: "Weatherproof",
    price: "From Rs. 1,200",
    dispatchTime: "Same Day",
    desc: "Seepage chemical barrier, rockwall finish, plastic emulsion & interior polish.",
    popularJobs: ["Seepage Chemical Treatment", "Wall Putty & Emulsion", "Ceiling Dampness Cure", "Door & Window Varnish"],
    iconBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    accentColor: "hover:border-violet-500/50"
  },
  {
    id: "appliance",
    name: "Appliance Repair",
    tag: "appliances",
    icon: Wrench,
    badge: "Fast Dispatch",
    price: "From Rs. 850",
    dispatchTime: "25-35 mins",
    desc: "Automatic washing machines, refrigerators, microwaves, ovens & water dispensers.",
    popularJobs: ["Washing Machine Spinner/Drum", "Fridge Cooling Coil & Gas", "Microwave Magnetron", "Water Dispenser Sensor"],
    iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    accentColor: "hover:border-emerald-500/50"
  },
  {
    id: "solar",
    name: "Solar & Power Tech",
    tag: "electrical",
    icon: SunMedium,
    badge: "Hybrid Systems",
    price: "From Rs. 2,200",
    dispatchTime: "Scheduled",
    desc: "Solar hybrid inverter wiring, net metering setup & lithium battery balancing.",
    popularJobs: ["Inverter Fault Code Diagnostic", "Solar Net Metering Audit", "Lithium Battery Setup", "Panel Structure Alignment"],
    iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accentColor: "hover:border-amber-500/50"
  },
  {
    id: "security",
    name: "CCTV & Security",
    tag: "appliances",
    icon: Camera,
    badge: "Smart Protection",
    price: "From Rs. 1,100",
    dispatchTime: "Same Day",
    desc: "IP camera setup, 4K DVR/NVR cabling, mobile live view & digital intercoms.",
    popularJobs: ["Mobile App Live View Setup", "DVR Hard Disk Recovery", "Night Vision IP Cameras", "Video Doorbell Intercom"],
    iconBg: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    accentColor: "hover:border-slate-500/50"
  }
];

const CITIES = [
  { name: "Lahore", areas: "DHA, Gulberg, Bahria Town, Model Town, Johar Town" },
  { name: "Karachi", areas: "Clifton, DHA, Gulshan-e-Iqbal, PECHS, North Nazimabad" },
  { name: "Islamabad", areas: "F-6, F-7, F-8, F-10, G-11, Bahria Town, DHA II" },
  { name: "Rawalpindi", areas: "Saddar, Westridge, Bahria Phase 1-8, Chaklala" },
  { name: "Faisalabad", areas: "D-Ground, Peoples Colony, Madina Town, Canal Road" },
  { name: "Multan", areas: "Cantt, Bosan Road, Gulgasht Colony, Model Town" },
  { name: "Peshawar", areas: "Hayatabad, University Town, Cantt, Warsak Road" }
];

const FAQS = [
  {
    q: "How are workers vetted and background-checked?",
    a: "Every technician on KaamFix passes a rigorous 3-tier validation: 1) Physical NADRA CNIC biometric verification, 2) Clean police clearance certificate, and 3) Hands-on practical trade competency assessment by our senior technical evaluators."
  },
  {
    q: "How does the AI Service Advisor work?",
    a: "Powered by Google Gemini 2.0, our AI Advisor accepts spoken or typed descriptions in Urdu or English. It determines the required trade, predicts the root cause, calculates transparent PKR market estimates, and provides immediate emergency safety tips before anyone touches a wire or valve."
  },
  {
    q: "What is the KaamFix 7-Day Workmanship Guarantee?",
    a: "If the exact repair fails or leaks within 7 calendar days of service completion, a senior technician is re-dispatched at zero fee, or you receive a full refund through our digital dispute resolution desk."
  },
  {
    q: "How does pricing and payment work?",
    a: "All services feature standardized base pricing with zero hidden surcharges or street bargaining. You see transparent estimates before dispatch and can pay via Cash on Delivery, JazzCash, EasyPaisa, or Online Bank Transfer."
  },
  {
    q: "How fast can a technician arrive at my house?",
    a: "For on-demand emergency calls (such as water pump failure or electrical tripping), our closest verified pro is matched and arrives within 20 to 35 minutes across all supported neighborhoods."
  },
  {
    q: "How can I join KaamFix as a certified technician?",
    a: "Tap 'Join as Pro', submit your CNIC and experience. After our rapid 24-hour verification and background check, your profile goes live and you receive verified job orders directly with weekly payouts."
  }
];

const TESTIMONIALS = [
  {
    name: "Dr. Ayesha Malik",
    location: "DHA Phase 5, Lahore",
    service: "AC Inverter PCB & Gas Refill",
    rating: 5,
    date: "Yesterday",
    avatar: "/assets/workers/worker-7.png",
    comment: "Our living room inverter AC stopped cooling during peak 42°C heat. The KaamFix AI pinpointed the issue, Tariq arrived in 25 minutes, showed me the exact leak with soapy water, and refilled gas with digital gauges. Transparent PKR pricing with zero bargaining!"
  },
  {
    name: "Kamran Siddiqui",
    location: "Clifton Block 4, Karachi",
    service: "Concealed Bathroom Pipe Burst",
    rating: 5,
    date: "3 days ago",
    avatar: "/assets/workers/worker-9.png",
    comment: "Woke up at 6:30 AM to water seeping through my parquet floors. Usman arrived equipped with pressure testing tools, found the underground hairline crack without breaking unnecessary tiles, and fixed it cleanly. Lifesavers!"
  },
  {
    name: "Brig. (R) Haroon Rashid",
    location: "Sector F-10/2, Islamabad",
    service: "Distribution Box Breaker Trip",
    rating: 5,
    date: "1 week ago",
    avatar: "/assets/workers/worker-11.png",
    comment: "The main Schneider 63A breaker kept tripping whenever the microwave was turned on. Other local mistris wanted to replace the entire meter panel. KaamFix electrician traced it to an ungrounded neutral wire in 20 minutes. Highly professional and courteous."
  }
];

export default function Auth({ onAuthSuccess, theme = "dark", onToggleTheme }: AuthProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"login" | "signup">("login");
  const [selectedRole, setSelectedRole] = useState<"customer" | "worker">("customer");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("Lahore");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedServiceQuick, setSelectedServiceQuick] = useState("Electrician");

  // AI Diagnostic State
  const [demoProblem, setDemoProblem] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<{
    trade: string;
    cost: string;
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "STANDARD";
    rootCause: string;
    safetyStep: string;
  } | null>(null);

  const openModal = (tab: "login" | "signup", role: "customer" | "worker" = "customer") => {
    setModalTab(tab);
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSimulateAi = (text: string) => {
    setDemoProblem(text);
    setAiLoading(true);
    setAiOutput(null);

    setTimeout(() => {
      const lower = text.toLowerCase();
      if (lower.includes("pipe") || lower.includes("water") || lower.includes("leak") || lower.includes("motor") || lower.includes("geyser")) {
        setAiOutput({
          trade: "Certified Senior Plumber",
          cost: "Rs. 1,200 – 2,800",
          urgency: "HIGH",
          rootCause: "High water pressure or worn rubber washer / hairline PPR pipe seam rupture.",
          safetyStep: "Immediately turn off the main roof tank supply valve before tracing the leak."
        });
      } else if (lower.includes("ac") || lower.includes("cool") || lower.includes("compressor") || lower.includes("gas") || lower.includes("inverter")) {
        setAiOutput({
          trade: "HVAC Inverter Specialist",
          cost: "Rs. 1,800 – 3,800",
          urgency: "MEDIUM",
          rootCause: "Low R32/R410 refrigerant level or choked outdoor condenser coil preventing heat exchange.",
          safetyStep: "Power off the circuit breaker to prevent motor coil burnout under high amperage."
        });
      } else if (lower.includes("smoke") || lower.includes("spark") || lower.includes("breaker") || lower.includes("trip") || lower.includes("fire")) {
        setAiOutput({
          trade: "Master Electrician",
          cost: "Rs. 1,500 – 3,200",
          urgency: "CRITICAL",
          rootCause: "Loose neutral wire terminal or overloaded sub-circuit sparking under resistive heating.",
          safetyStep: "Switch off the Main 63A Distribution Breaker immediately. Do NOT touch with wet hands."
        });
      } else {
        setAiOutput({
          trade: "Master Carpenter / Hardware Specialist",
          cost: "Rs. 950 – 2,200",
          urgency: "STANDARD",
          rootCause: "Hydraulic hinge misalignment or wood swelling from atmospheric humidity.",
          safetyStep: "Avoid forcing stuck hinges as it strips raw wood fiber inside the cabinet panel."
        });
      }
      setAiLoading(false);
    }, 600);
  };

  const filteredCategories = activeCategoryFilter === "all"
    ? CATEGORIES_DATA
    : CATEGORIES_DATA.filter((c) => c.tag === activeCategoryFilter);

  return (
    <div className="min-h-screen bg-[#10231d] text-slate-100 font-sans selection:bg-emerald-600 selection:text-white flex flex-col relative overflow-x-hidden">
      
      {/* Restrained forest ambient glow for the marketing experience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-emerald-700/15 via-teal-600/10 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-[700px] -right-32 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed top-[2200px] -left-32 w-[700px] h-[700px] bg-teal-900/10 rounded-full blur-[180px] pointer-events-none -z-10" />

      {/* REFINED DOT GRID BACKGROUND */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none -z-10" />

      {/* ========================================================================= */}
      {/* 1. TOP ANNOUNCEMENT BAR                                                   */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#142a23] border-b border-slate-800/80 py-2 px-4 text-xs font-medium text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">Live Dispatch:</span>
            <span className="truncate text-slate-300">
              Electrician assigned in <strong className="text-white">DHA Lahore</strong> 4 mins ago • Senior Plumber assigned in <strong className="text-white">Clifton Karachi</strong>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 shrink-0 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% CNIC Background Checked
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              4.9/5 Rating (15,400+ Jobs)
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <Phone className="w-3 h-3 text-emerald-400" />
              042-111-KAAMFIX
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED, PROFESSIONAL NAVBAR (PROPER SPACING, ZERO WRAPPING)           */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#10231d]/90 border-b border-slate-800/90 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[74px] flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-900/30 ring-1 ring-emerald-400/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-display">KaamFix</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PAKISTAN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-normal">Certified Tradesman Network</p>
            </div>
          </div>

          {/* Center Navigation Links - Guaranteed Single Line */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300 whitespace-nowrap">
            <a href="#services" className="hover:text-emerald-400 transition-colors">Services</a>
            <a href="#ai-advisor" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Advisor</span>
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a>
            <a href="#technicians" className="hover:text-emerald-400 transition-colors">Verified Pros</a>
            <a href="#guarantee" className="hover:text-emerald-400 transition-colors">Guarantee</a>
            <a href="#faqs" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all shadow-sm shrink-0"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
              </button>
            )}

            {/* Become a Pro Button */}
            <button
              onClick={() => openModal("signup", "worker")}
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all items-center gap-1.5 shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Join as Pro</span>
            </button>

            {/* Sign In Button */}
            <button
              onClick={() => openModal("login", "customer")}
              className="px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all shrink-0"
            >
              Sign In
            </button>

            {/* Primary Action Button - Solid Professional Royal Blue */}
            <button
              onClick={() => openModal("signup", "customer")}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center gap-2 shrink-0"
            >
              <span>Book a Pro</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% CNIC Biometric & Police Cleared Pros</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] font-display">
              Fix Any Home Issue in <br />
              <span className="text-emerald-500">
                30 Minutes. Guaranteed.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed mx-auto lg:mx-0 font-normal">
              No more street bargaining, unverified strangers, or arbitrary overcharging. Book certified electricians, plumbers, AC technicians, and carpenters backed by upfront PKR rates and an insured 7-day warranty.
            </p>

            {/* Search & Booking Box */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-xl max-w-2xl mx-auto lg:mx-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                
                {/* Service Selector */}
                <div className="sm:col-span-5 flex items-center gap-2.5 px-3.5 py-2.5 bg-[#162b24] rounded-xl border border-slate-800">
                  <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex flex-col text-left w-full">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service</span>
                    <select
                      value={selectedServiceQuick}
                      onChange={(e) => setSelectedServiceQuick(e.target.value)}
                      className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="Electrician" className="bg-slate-900 text-white">⚡ Electrician</option>
                      <option value="Plumber" className="bg-slate-900 text-white">🔧 Plumber</option>
                      <option value="AC Technician" className="bg-slate-900 text-white">❄️ AC Technician</option>
                      <option value="Carpenter" className="bg-slate-900 text-white">🪵 Carpenter</option>
                      <option value="Painter" className="bg-slate-900 text-white">🎨 Painter & Seepage</option>
                      <option value="Appliance Repair" className="bg-slate-900 text-white">🛠️ Appliance Repair</option>
                      <option value="Solar Technician" className="bg-slate-900 text-white">☀️ Solar & UPS</option>
                      <option value="CCTV Security" className="bg-slate-900 text-white">📹 CCTV & Security</option>
                    </select>
                  </div>
                </div>

                {/* City Selector */}
                <div className="sm:col-span-4 flex items-center gap-2.5 px-3.5 py-2.5 bg-[#162b24] rounded-xl border border-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex flex-col text-left w-full">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">City</span>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      {CITIES.map((c) => (
                        <option key={c.name} value={c.name} className="bg-slate-900 text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="sm:col-span-3">
                  <button
                    onClick={() => openModal("signup", "customer")}
                    className="w-full h-full min-h-[46px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Check Pros</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Clean Popular Chips - Clean Wrap with No Scrollbar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 font-medium shrink-0">Popular:</span>
                {[
                  "Short Circuit",
                  "Pipe Leak",
                  "AC Gas Refill",
                  "Water Pump",
                  "Kitchen Cabinet",
                  "Geyser Repair"
                ].map((kw) => (
                  <button
                    key={kw}
                    onClick={() => openModal("signup", "customer")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Signals */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Advance Scams</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>30-Min Rapid Arrival</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>7-Day Work Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-300" />
                <span>Rs. 0 If Not Diagnosed</span>
              </div>
            </div>

          </motion.div>

          {/* Right Hero Column: Real Dispatch Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5 relative"
          >
            <div className="bg-[#142a23] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Active Dispatch</span>
                </div>
                <span className="text-xs font-medium text-slate-400">{selectedCity} Region</span>
              </div>

              {/* Technician Info */}
              <div className="p-4 bg-[#10231d] border border-slate-800 rounded-2xl flex items-center gap-4">
                <img
                  src="/assets/workers/worker-1.png"
                  alt="Tariq Mehmood"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-md shrink-0"
                />

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white truncate">Tariq Mehmood</h3>
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      4.9 (142 reviews)
                    </span>
                  </div>
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Master Electrician • 8 Yrs Exp
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    CNIC Verified • Active in Gulberg & DHA
                  </p>
                </div>
              </div>

              {/* ETA Bar */}
              <div className="space-y-2 bg-[#10231d] p-3.5 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Live ETA to Destination</span>
                  <span className="text-emerald-400 font-bold">18 Minutes</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-emerald-600 rounded-full"></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Dispatched</span>
                  <span>Tools Ready</span>
                  <span className="text-emerald-400 font-medium">On The Way</span>
                </div>
              </div>

              {/* Quick Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#10231d] rounded-xl border border-slate-800 text-center">
                  <p className="text-xl font-bold text-white">Rs. 850</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Fixed Base Fare</p>
                </div>
                <div className="p-3 bg-[#10231d] rounded-xl border border-slate-800 text-center">
                  <p className="text-xl font-bold text-emerald-400">7 Days</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Work Warranty</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => openModal("signup", "customer")}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Instant 30-Min Booking</span>
              </button>

            </div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. METRICS STRIP                                                          */}
      {/* ========================================================================= */}
      <section className="border-y border-slate-800/80 bg-[#10231d] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-display">15,400+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Completed Verified Jobs</p>
              <p className="text-[10px] text-emerald-400 font-semibold">99.4% Job Success Rate</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-display">650+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">CNIC-Verified Technicians</p>
              <p className="text-[10px] text-slate-400 font-semibold">NADRA & Police Cleared</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-display">&lt; 28 Mins</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Average Arrival Time</p>
              <p className="text-[10px] text-emerald-400 font-semibold">Emergency Live Dispatch</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-display">4.9 / 5.0</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Customer Review Rating</p>
              <p className="text-[10px] text-amber-400 font-semibold">12,200+ Verified Reviews</p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SERVICES DIRECTORY & PRICE CATALOG                                     */}
      {/* ========================================================================= */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Comprehensive Trade Services</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            Every Household Repair, Fixed by Experts.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Transparent PKR rates with verified local technicians ready to dispatch across {selectedCity} and major cities.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {[
            { id: "all", label: "All Services" },
            { id: "electrical", label: "⚡ Electrical & Solar" },
            { id: "plumbing", label: "🔧 Plumbing & Water" },
            { id: "cooling", label: "❄️ AC & HVAC" },
            { id: "woodwork", label: "🪵 Carpentry" },
            { id: "renovation", label: "🎨 Painting & Seepage" },
            { id: "appliances", label: "🛠️ Appliances & CCTV" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategoryFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.id}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                onClick={() => openModal("signup", "customer")}
                className={`group p-6 bg-[#162b24]/80 hover:bg-[#1b342b] border border-slate-800 ${cat.accentColor} rounded-2xl transition-all duration-200 shadow-md cursor-pointer flex flex-col justify-between space-y-5`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${cat.iconBg} border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {cat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Common Fixes:</span>
                    {cat.popularJobs.slice(0, 3).map((job) => (
                      <div key={job} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{job}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-400">{cat.price}</span>
                    <p className="text-[10px] text-slate-400">ETA: {cat.dispatchTime}</p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white text-xs font-semibold text-slate-300 transition-all flex items-center gap-1">
                    Book <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. AI DIAGNOSTIC STUDIO (GEMINI 2.0)                                      */}
      {/* ========================================================================= */}
      <section id="ai-advisor" className="py-24 bg-[#0d1d18] border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Powered by Google Gemini 2.0</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
                Not sure what's broken? <br />
                <span className="text-emerald-500">
                  Let AI Diagnose It
                </span>{" "}
                in Plain Words.
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Describe the unusual sound, spark, water leak, or fault code. Our AI advisor analyzes the root cause, calculates realistic Pakistani market rates, warns of electrical/flooding hazards, and assigns the correct certified specialist.
              </p>

              <div className="space-y-3 pt-2 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Identifies required trade specialist automatically</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Fair PKR parts & labor estimation before hiring</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Immediate critical life-safety isolation instructions</span>
                </div>
              </div>

              <button
                onClick={() => openModal("signup", "customer")}
                className="mt-4 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center lg:justify-start gap-2 mx-auto lg:mx-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Full AI Advisor Studio</span>
              </button>
            </div>

            <div className="lg:col-span-6 bg-[#142a23] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Live AI Simulator</span>
                  <h3 className="text-base font-bold text-white">Click any sample household problem:</h3>
                </div>
                <span className="text-[10px] font-medium text-slate-400 px-2 py-1 bg-[#10231d] rounded-lg">Instant Preview</span>
              </div>

              {/* Sample Prompts */}
              <div className="flex flex-wrap gap-2">
                {[
                  "🔥 Circuit breaker trips when iron is plugged in",
                  "💧 Kitchen sink pipe burst leaking into floor",
                  "❄️ Inverter AC outdoor humming but warm air",
                  "🪵 Main door lock stuck and won't turn"
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => handleSimulateAi(sample)}
                    className="px-3 py-1.5 rounded-xl bg-[#10231d] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium text-left transition-all"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* Textarea simulation */}
              <div className="space-y-2 pt-1">
                <textarea
                  value={demoProblem}
                  onChange={(e) => setDemoProblem(e.target.value)}
                  placeholder="Or describe what's broken in your own words (Urdu or English)..."
                  rows={3}
                  className="w-full p-3.5 rounded-xl bg-[#10231d] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none transition-colors"
                />
                
                <button
                  onClick={() => handleSimulateAi(demoProblem || "Circuit breaker trips when iron is plugged in")}
                  disabled={aiLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  {aiLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{aiLoading ? "Gemini Analyzing..." : "Run AI Diagnostics Now"}</span>
                </button>
              </div>

              {/* AI Diagnostic Output */}
              {aiOutput && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-[#10231d] border border-emerald-500/30 rounded-2xl space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-white pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                      <Wrench className="w-4 h-4" />
                      {aiOutput.trade}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      aiOutput.urgency === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      Urgency: {aiOutput.urgency}
                    </span>
                  </div>

                  <p className="text-slate-300">
                    <strong className="text-white">Root Cause:</strong> {aiOutput.rootCause}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Estimated Repair Cost:</span>
                    <span className="font-bold text-emerald-400">{aiOutput.cost}</span>
                  </div>

                  <p className="text-amber-300 bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30 leading-relaxed">
                    <strong className="text-amber-400">Safety Tip:</strong> {aiOutput.safetyStep}
                  </p>

                  <button
                    onClick={() => openModal("signup", "customer")}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Dispatch This Specialist Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. THE KAAMFIX STANDARD (COMPARISON)                                      */}
      {/* ========================================================================= */}
      <section id="guarantee" className="py-24 bg-[#10231d] border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>The KaamFix Standard</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
              Why KaamFix vs Traditional Mistris
            </h2>
            <p className="text-slate-400 text-sm">
              See the direct difference between roadside unverified labor and certified, insured platform pros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* KaamFix Card */}
            <div className="p-8 rounded-3xl bg-[#142a23] border-2 border-emerald-500/40 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">KaamFix Verified Pros</h3>
                    <p className="text-xs text-emerald-400 font-medium">Protected & Guaranteed</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20">
                  Recommended
                </span>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>NADRA CNIC Verification:</strong> Biometrically verified identity & clean police record checks.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Fixed Upfront Pricing:</strong> Standardized PKR rate cards; zero street haggling or surprise charges.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>7-Day Work Warranty:</strong> Free re-inspection & rework if the exact fault returns within a week.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Gemini AI Diagnostics:</strong> Accurate root cause and parts diagnosis before opening your appliance.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Digital Tracking:</strong> Real-time ETA, digital work orders & transparent electronic receipts.</span>
                </div>
              </div>
            </div>

            {/* Roadside Mistri Card */}
            <div className="p-8 rounded-3xl bg-[#10231d] border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-300">Roadside Naka Mistris</h3>
                  <p className="text-xs text-rose-400 font-medium">Unregulated & Risky</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-400">
                <div className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>Unverified identity, zero background verification or criminal record tracking.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>Arbitrary price inflation based on your neighborhood or appearance; non-stop bargaining.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>Zero accountability: once payment is handed over, the mistri never answers your phone.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>Trial-and-error guesswork that damages expensive inverter circuits or water fittings.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>No formal receipts, zero dispute arbitration, and no guarantee whatsoever.</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. HOW IT WORKS                                                           */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Effortless Process</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            How KaamFix Works in 3 Steps
          </h2>
          <p className="text-slate-400 text-sm">
            From booking to completed repair with total peace of mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 bg-[#142a23] border border-slate-800 hover:border-emerald-500/40 rounded-3xl space-y-4 text-center transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-2xl flex items-center justify-center mx-auto">
              1
            </div>
            <h3 className="text-xl font-bold text-white">Select Service or Ask AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick your category or describe your issue in plain Roman Urdu / English. Our AI Advisor pinpoints the exact trade and transparent price range.
            </p>
          </div>

          <div className="p-8 bg-[#142a23] border border-slate-800 hover:border-emerald-500/40 rounded-3xl space-y-4 text-center transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-2xl flex items-center justify-center mx-auto">
              2
            </div>
            <h3 className="text-xl font-bold text-white">Instant Dispatch & Arrival</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our automated dispatch system connects you to the highest-rated background-checked pro in your neighborhood who arrives within 30 minutes.
            </p>
          </div>

          <div className="p-8 bg-[#142a23] border border-slate-800 hover:border-emerald-500/40 rounded-3xl space-y-4 text-center transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-2xl flex items-center justify-center mx-auto">
              3
            </div>
            <h3 className="text-xl font-bold text-white">Guaranteed Completion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The technician fixes the problem with professional tools. Settle transparently via cash or online, backed by an insured 7-day warranty.
            </p>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 9. REAL TECHNICIAN PROFILES SHOWCASE                                      */}
      {/* ========================================================================= */}
      <section id="technicians" className="py-24 bg-[#10231d] border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Meet Our Certified Specialists</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
              Real Local Technicians You Can Trust
            </h2>
            <p className="text-slate-400 text-sm">
              Each pro has verified credentials, hundreds of customer reviews, and proven expertise in their specialized trade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 bg-[#142a23] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/workers/worker-1.png"
                  alt="Tariq Mehmood"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-base text-white">Tariq Mehmood</h4>
                  <p className="text-xs text-emerald-400 font-medium">Master Electrician • 8 Yrs Exp</p>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>4.9 (142 completed jobs)</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                "Specialized in breaker panel short-circuit tracing, DC inverter wiring, and generator auto-changeover panels across Lahore."
              </p>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  DHA & Gulberg, Lahore
                </span>
                <span className="text-emerald-400 font-semibold">CNIC Verified</span>
              </div>
            </div>

            <div className="p-6 bg-[#142a23] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/workers/worker-2.png"
                  alt="Muhammad Usman"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-base text-white">Muhammad Usman</h4>
                  <p className="text-xs text-emerald-400 font-medium">Senior Plumber • 10 Yrs Exp</p>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>4.8 (188 completed jobs)</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                "Underground pipe leak detection, water pump overhaul, sanitary installations, and instant geyser maintenance in Karachi."
              </p>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Clifton & DHA, Karachi
                </span>
                <span className="text-emerald-400 font-semibold">CNIC Verified</span>
              </div>
            </div>

            <div className="p-6 bg-[#142a23] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src="/assets/workers/worker-3.png"
                  alt="Farhan Ahmad"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-base text-white">Farhan Ahmad</h4>
                  <p className="text-xs text-emerald-400 font-medium">HVAC Specialist • 6 Yrs Exp</p>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>4.9 (96 completed jobs)</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                "DC Inverter master chemical servicing, precision digital gas refilling (R32/R410), and compressor PCB circuit repairs in Islamabad."
              </p>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  F-Sectors & Bahria, Islamabad
                </span>
                <span className="text-emerald-400 font-semibold">CNIC Verified</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. TESTIMONIALS                                                          */}
      {/* ========================================================================= */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Customer Testimonials</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            Loved by 15,000+ Homeowners
          </h2>
          <p className="text-slate-400 text-sm">
            Read what real customers across Pakistan say about our verified service pros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-8 rounded-3xl bg-[#142a23] border border-slate-800 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{t.date}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  "{t.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-xs text-white">{t.name}</h4>
                  <p className="text-[10px] text-slate-400">{t.location} • <span className="text-emerald-400 font-medium">{t.service}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. DUAL ACTION BANNER                                                    */}
      {/* ========================================================================= */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="p-8 sm:p-10 rounded-3xl bg-[#142a23] border border-emerald-500/30 flex flex-col justify-between space-y-6 shadow-xl">
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                For Homeowners
              </span>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white font-display">Need an Urgent Repair Today?</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Connect with verified local technicians ready to dispatch to your location right now. Standardized rates with guaranteed 7-day protection.
              </p>
            </div>
            <button
              onClick={() => openModal("signup", "customer")}
              className="w-fit px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <span>Book a Service Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-[#142a23] border border-slate-700/80 flex flex-col justify-between space-y-6 shadow-xl">
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                For Skilled Technicians
              </span>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white font-display">Earn Up to Rs. 150,000/mo</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Join our certified pro technician directory and receive verified customer jobs directly in your city with guaranteed weekly direct payouts.
              </p>
            </div>
            <button
              onClick={() => openModal("signup", "worker")}
              className="w-fit px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 border border-slate-700"
            >
              <span>Join as a Certified Worker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. FAQ ACCORDION                                                         */}
      {/* ========================================================================= */}
      <section id="faqs" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="bg-[#142a23] border border-slate-800 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-white hover:text-emerald-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-emerald-400" : "text-slate-500"}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 13. FINAL CTA BANNER (ROYAL COBALT GRADIENT)                              */}
      {/* ========================================================================= */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            Ready to Fix Your Home Without the Stress?
          </h2>
          <p className="text-emerald-100 font-medium text-sm sm:text-base max-w-2xl mx-auto">
            Join thousands of happy homeowners across Pakistan booking certified service pros on KaamFix. Instant dispatch, upfront prices, guaranteed quality.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
            <button
              onClick={() => openModal("signup", "customer")}
              className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => openModal("login", "customer")}
              className="px-8 py-4 bg-emerald-900/60 hover:bg-emerald-900/80 text-white font-bold text-sm rounded-2xl backdrop-blur-md transition-all border border-emerald-400/30"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 14. FOOTER                                                                */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800/80 bg-[#0b1915] py-14 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white">
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-lg font-display">KaamFix</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Pakistan's premier digital trade marketplace connecting verified skilled technicians with residential and commercial properties.
              </p>
              <div className="pt-2 flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-white text-xs">+92 (042) 111-522-634</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Top Services</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#services" className="hover:text-emerald-400 transition-colors">Electrician & Breaker Repair</a></li>
                <li><a href="#services" className="hover:text-emerald-400 transition-colors">Plumbing & Sanitary Piping</a></li>
                <li><a href="#services" className="hover:text-emerald-400 transition-colors">DC Inverter AC Service & Gas</a></li>
                <li><a href="#services" className="hover:text-emerald-400 transition-colors">Custom Carpentry & Lock Fitting</a></li>
                <li><a href="#services" className="hover:text-emerald-400 transition-colors">Solar Inverter & Net Metering</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Major Cities Covered</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><span>Lahore (DHA, Gulberg, Bahria)</span></li>
                <li><span>Karachi (Clifton, DHA, Gulshan)</span></li>
                <li><span>Islamabad & Rawalpindi</span></li>
                <li><span>Faisalabad & Multan</span></li>
                <li><span>Peshawar & Quetta</span></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Platform & Access</h4>
              <div className="space-y-2 pt-1 text-[11px]">
                <button
                  onClick={() => openModal("login", "customer")}
                  className="block text-left text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  → Customer Portal Sign In
                </button>
                <button
                  onClick={() => openModal("login", "worker")}
                  className="block text-left text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  → Verified Worker Portal
                </button>
                <button
                  onClick={() => openModal("login", "customer")}
                  className="block text-left text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  → Admin / Management Console
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© {new Date().getFullYear()} KaamFix Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Worker Code of Ethics</span>
            </div>
          </div>

        </div>
      </footer>

      {/* LAZY LOADED AUTH MODAL */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <AuthModal
            isOpen={isModalOpen}
            initialTab={modalTab}
            initialRole={selectedRole}
            onClose={closeModal}
            onAuthSuccess={onAuthSuccess}
            theme={theme}
          />
        )}
      </Suspense>

    </div>
  );
}



