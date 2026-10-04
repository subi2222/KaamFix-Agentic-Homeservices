import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  FileText,
  ClipboardList,
  CheckCircle2,
  MapPin,
  Wrench,
  TrendingUp,
  Activity,
  DollarSign,
  ArrowRight,
  Bell,
  ShieldCheck,
  Star,
  Users,
  Award,
  Clock,
  MessageCircle,
  X,
  ChevronRight,
  PhoneCall,
  Headphones,
  Zap,
  ThumbsUp,
  Calendar,
  Building2,
  HelpCircle,
  UserCheck
} from "lucide-react";
import { ServiceRequest, WorkerProfile } from "../types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import WorkerAvatar from "./WorkerAvatar";
import { getWorkers, subscribeWorkers } from "../lib/dbService";
import { toAppDate } from "../lib/dateUtils";

interface CustomerDashboardProps {
  userName: string;
  requests: ServiceRequest[];
  onNavigate: (view: string) => void;
  onOpenRoom?: (requestId: string) => void;
}

export default function CustomerDashboard({ userName, requests, onNavigate, onOpenRoom }: CustomerDashboardProps) {
  const [featuredWorkers, setFeaturedWorkers] = useState<WorkerProfile[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");

  // Time-based greeting calculation
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good Morning", icon: "🌅" };
    if (hour < 18) return { text: "Good Afternoon", icon: "☀️" };
    return { text: "Good Evening", icon: "🌙" };
  };

  const greeting = getGreeting();

  // Statistics Calculations
  const total = requests.length;
  const pending = requests.filter((r) => r.status === "pending").length;
  const active = requests.filter((r) => r.status === "accepted" || r.status === "in_progress").length;
  const completed = requests.filter((r) => r.status === "completed").length;
  const totalSpent = requests
    .filter((r) => r.status === "completed")
    .reduce((acc, curr) => acc + (curr.budget || 0), 0);

  const recentRequests = requests.slice(0, 4);

  // Fetch Featured Approved Workers (Real-time listener filtering status == "approved")
  useEffect(() => {
    const unsub = subscribeWorkers((allWorkers) => {
      // Filter strictly for status === "approved" (hides pending & suspended workers)
      const approvedOnly = allWorkers.filter((w) => w.status === "approved");
      if (approvedOnly.length > 0) {
        const sorted = [...approvedOnly].sort((a, b) => b.rating - a.rating || b.experience - a.experience);
        setFeaturedWorkers(sorted.slice(0, 6));
      } else {
        setFeaturedWorkers([]);
      }
      setLoadingWorkers(false);
    });

    return () => unsub();
  }, []);

  // Rolling three-month analytics derived only from actual completed requests.
  const chartData = Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (2 - index));
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const matching = requests.filter((request) => {
      const rawDate = toAppDate(request.createdAt, request.date);
      return !Number.isNaN(rawDate.getTime()) && rawDate.getMonth() === date.getMonth() && rawDate.getFullYear() === date.getFullYear();
    });
    return {
      month,
      bookings: matching.length,
      spent: matching.filter((request) => request.status === "completed").reduce((sum, request) => sum + (request.budget || 0), 0)
    };
  });
  const hasChartData = chartData.some((point) => point.spent > 0);

  // Trending Categories Data
  const trendingCategories = [
    {
      id: "plumbing",
      title: "Emergency Plumbing",
      category: "Plumbing",
      rate: "From Rs. 1,000/hr",
      icon: Wrench,
      badge: "High Demand",
      color: "from-stone-600 to-stone-700",
      bgLight: "bg-stone-50 dark:bg-stone-950/50 text-stone-600 dark:text-stone-400"
    },
    {
      id: "electrician",
      title: "Wiring & Power Fixes",
      category: "Electrician",
      rate: "From Rs. 1,200/hr",
      icon: Zap,
      badge: "Trending",
      color: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
    },
    {
      id: "ac-repair",
      title: "AC Inverter Service",
      category: "AC Repair",
      rate: "From Rs. 1,800/hr",
      icon: Sparkles,
      badge: "Popular",
      color: "from-orange-600 to-stone-700",
      bgLight: "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400"
    },
    {
      id: "carpentry",
      title: "Furniture & Door Repair",
      category: "Carpentry",
      rate: "From Rs. 1,100/hr",
      icon: Building2,
      badge: "Top Rated",
      color: "from-stone-600 to-stone-700",
      bgLight: "bg-stone-50 dark:bg-stone-950/50 text-stone-600 dark:text-stone-400"
    }
  ];

  return (
    <div className="dashboard-page space-y-8 animate-fade-in pb-20 relative">
      
      {/* 1. Dynamic Welcome Header */}
      <section className="bg-[#24231f] rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl border border-orange-700/30">
        {/* Animated Background Decorative Blobs */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-stone-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold text-orange-300 uppercase tracking-widest bg-orange-500/20 px-3.5 py-1 rounded-full border border-orange-400/30 backdrop-blur-md flex items-center gap-1.5">
                <span>{greeting.icon}</span> {greeting.text}
              </span>
              <span className="text-[11px] font-semibold text-orange-200/80 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="text-[11px] font-semibold text-orange-300 bg-orange-400/20 px-2.5 py-1 rounded-full border border-orange-400/20 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
                Service Marketplace
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Welcome back, {userName || "Valued Customer"}!
            </h1>

            <p className="text-orange-100/90 text-xs md:text-sm leading-relaxed max-w-xl">
              Book certified local professionals for plumbing, electrical, AC repair, and home maintenance with transparent pricing & verified service guarantees.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0 w-full lg:w-auto">
            <button
              onClick={() => onNavigate("radar")}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-white hover:bg-orange-50 text-orange-950 text-xs font-extrabold rounded-2xl shadow-lg transition-all duration-200 hover:scale-102 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-orange-700" />
              NEXA Live Radar
            </button>
            <button
              onClick={() => onNavigate("ai-advisor")}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-white text-xs font-extrabold rounded-2xl backdrop-blur-md transition-all duration-200 hover:scale-102 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-stone-300" />
              AI Advisor
            </button>
            <button
              onClick={() => {
                const targetReq = requests.find((r) => ["accepted", "en_route", "arrived", "in_progress", "work_finished", "completed"].includes(r.status)) || requests[0];
                if (targetReq) {
                  sessionStorage.setItem("kaamfix_room_request", targetReq.requestId);
                  if (onOpenRoom) {
                    onOpenRoom(targetReq.requestId);
                    return;
                  }
                }
                onNavigate("booking-room");
              }}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-orange-950/20 transition-all duration-200 hover:scale-102 flex items-center justify-center gap-2 relative group"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Booking Room</span>
              {active > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Live Active Booking Room Status Banner */}
      {active > 0 && (() => {
        const liveBooking = requests.find((r) => ["accepted", "en_route", "arrived", "in_progress", "work_finished"].includes(r.status));
        if (!liveBooking) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-orange-950/40 rounded-3xl border border-orange-200 dark:border-orange-800/60 flex flex-wrap items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-600 text-white rounded-2xl shadow-md">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/80 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-900/50">
                    Live Booking in Progress
                  </span>
                  <span className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                    {liveBooking.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Professional: <span className="font-semibold text-gray-800 dark:text-slate-200">{liveBooking.workerName || "Assigned Pro"}</span> • Status: <span className="uppercase text-orange-600 dark:text-orange-400 font-bold">{liveBooking.status.replace("_", " ")}</span>
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                sessionStorage.setItem("kaamfix_room_request", liveBooking.requestId);
                if (onOpenRoom) {
                  onOpenRoom(liveBooking.requestId);
                  return;
                }
                onNavigate("booking-room");
              }}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Enter Booking Room
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        );
      })()}

      {/* 2. Quick Actions Bar */}
      <section className="space-y-3">
        <h2 className="text-xs font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">
          Quick Access Hub
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => onNavigate("book-service")}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/40 cursor-pointer transition-all space-y-2 group"
          >
            <div className="p-2.5 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl w-fit group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Book Service</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Submit new repair</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => {
              const targetReq = requests.find((r) => ["accepted", "en_route", "arrived", "in_progress", "work_finished", "completed"].includes(r.status)) || requests[0];
              if (targetReq) {
                sessionStorage.setItem("kaamfix_room_request", targetReq.requestId);
                if (onOpenRoom) {
                  onOpenRoom(targetReq.requestId);
                  return;
                }
              }
              onNavigate("booking-room");
            }}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/40 cursor-pointer transition-all space-y-2 group"
          >
            <div className="p-2.5 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl w-fit group-hover:bg-orange-600 group-hover:text-white transition-colors relative">
              <MessageCircle className="w-5 h-5" />
              {active > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Booking Room</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{active > 0 ? `${active} active live` : "Live chat & GPS"}</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => onNavigate("ai-advisor")}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-stone-500/40 cursor-pointer transition-all space-y-2 group"
          >
            <div className="p-2.5 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl w-fit group-hover:bg-stone-600 group-hover:text-white transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">AI Advisor</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Diagnose & estimate</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => onNavigate("requests")}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-stone-500/40 cursor-pointer transition-all space-y-2 group"
          >
            <div className="p-2.5 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl w-fit group-hover:bg-stone-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">My Requests</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{total} active & past</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => onNavigate("radar")}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-stone-500/40 cursor-pointer transition-all space-y-2 group"
          >
            <div className="p-2.5 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl w-fit group-hover:bg-stone-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">NEXA Radar</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Find online pros nearby</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => onNavigate("faq")}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/40 cursor-pointer transition-all space-y-2 group"
          >
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl w-fit group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Help & FAQ</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Customer guides</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* KPI Stats Bento Grid (Preserved & Enhanced) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -3 }} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-2xl border border-orange-100/50 dark:border-orange-900/40 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Bookings</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">{total}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100/50 dark:border-amber-900/40 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Jobs</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">{active}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-2xl border border-stone-100/50 dark:border-stone-900/40 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">{completed}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-2xl border border-stone-100/50 dark:border-stone-900/40 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Spent</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">Rs. {totalSpent}</p>
          </div>
        </motion.div>
      </section>

      {/* 3. Trending Services Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-50 dark:bg-orange-950/80 rounded-md text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/40 mb-1">
              <TrendingUp className="w-3 h-3" /> High Demand Services
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-slate-100">Trending Repair Categories</h2>
          </div>
          <button
            onClick={() => onNavigate("discovery")}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
          >
            Explore All Categories <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.id}
                whileHover={{ y: -4 }}
                onClick={() => onNavigate("discovery")}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/30 cursor-pointer transition-all space-y-3 relative overflow-hidden group"
              >
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${cat.bgLight}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                    {cat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1">
                    {cat.rate}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-50 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400 group-hover:text-orange-600">
                  <span>Browse Pros</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 4. Featured Professionals Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/80 rounded-md text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40 mb-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Verified Specialists
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-slate-100">Featured Top-Rated Workers</h2>
          </div>
          <button
            onClick={() => onNavigate("discovery")}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
          >
            View All Workers <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingWorkers ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-2/3"></div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="h-10 bg-gray-100 dark:bg-slate-800/60 rounded-2xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredWorkers.map((worker) => (
              <motion.div
                key={worker.uid}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/40 transition-all space-y-4 relative flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <WorkerAvatar photoURL={worker.photoURL} profileImage={worker.profileImage} name={worker.name} sizeClassName="w-12 h-12 text-sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {worker.name}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" title="Verified Worker" />
                        </div>
                        <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                          {worker.category} • {worker.experience} yrs exp
                        </p>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/80 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1 border border-amber-200/50 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{worker.rating > 0 ? worker.rating.toFixed(1) : "5.0"}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                    {worker.bio || `Specialist ${worker.category} available for home service calls.`}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block uppercase font-bold">Hourly Rate</span>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                      Rs. {worker.pricing.toLocaleString()} / hr
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate("discovery")}
                    className="px-3.5 py-2 bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-600 dark:hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    View & Book <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Platform Achievement Counters */}
      <section className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-orange-800/30 shadow-lg">
        <div className="text-center max-w-xl mx-auto space-y-1 mb-6">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400 bg-orange-500/20 px-3 py-0.5 rounded-full border border-orange-400/20">
            Platform Impact
          </span>
          <h2 className="text-xl md:text-2xl font-black">Trusted Home Care Across Pakistan</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
            <Users className="w-6 h-6 text-orange-400 mx-auto" />
            <p className="text-2xl md:text-3xl font-black text-white">150+</p>
            <p className="text-xs text-orange-200/80 font-medium">Verified Workers</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
            <UserCheck className="w-6 h-6 text-stone-400 mx-auto" />
            <p className="text-2xl md:text-3xl font-black text-white">1,200+</p>
            <p className="text-xs text-orange-200/80 font-medium">Happy Customers</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-orange-400 mx-auto" />
            <p className="text-2xl md:text-3xl font-black text-white">2,400+</p>
            <p className="text-xs text-orange-200/80 font-medium">Completed Jobs</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
            <Building2 className="w-6 h-6 text-stone-400 mx-auto" />
            <p className="text-2xl md:text-3xl font-black text-white">12+</p>
            <p className="text-xs text-orange-200/80 font-medium">Cities Covered</p>
          </div>
        </div>
      </section>

      {/* Main Grid: Recharts Expenditure + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                Service Expenditures & Booking History
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Track your monthly home service investments</p>
            </div>
          </div>

          <div className="h-60 pt-4">
            {hasChartData ? <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSpentCust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", color: "#fff", border: "none" }}
                  formatter={(value: any) => [`Rs. ${value}`, "Expenditure"]}
                />
                <Area type="monotone" dataKey="spent" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSpentCust)" />
              </AreaChart>
            </ResponsiveContainer> : (
              <div className="h-full rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center px-6">
                <Calendar className="w-8 h-8 text-orange-400 mb-3" />
                <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">No completed service spending yet</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Your monthly expenditure chart will update when a booked service is completed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Smart Problem Diagnosis Banner */}
        <div className="space-y-4 flex flex-col justify-between">
          <div
            onClick={() => onNavigate("ai-advisor")}
            className="p-6 bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-3xl border border-stone-800/30 shadow-md cursor-pointer hover:scale-[1.02] transition-all space-y-3 relative overflow-hidden group h-full flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="p-3 bg-stone-500/20 text-stone-300 rounded-2xl border border-stone-400/20">
                  <Sparkles className="w-6 h-6" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300 bg-stone-500/20 px-2.5 py-0.5 rounded-full border border-stone-400/20">AI Assistant</span>
              </div>
              <h3 className="font-black text-lg text-white">Smart Problem Diagnosis</h3>
              <p className="text-xs text-stone-200 leading-relaxed">
                Describe home repair issues in plain language to receive instant diagnostic recommendations, estimated prices, and direct specialist matching.
              </p>
            </div>

            <button onClick={(event) => { event.stopPropagation(); onNavigate("ai-advisor"); }} className="mt-4 w-full py-3 bg-stone-500/30 hover:bg-stone-500/40 text-white rounded-2xl text-xs font-bold border border-stone-400/30 flex items-center justify-center gap-2">
              Launch AI Diagnosis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Customer Activity Timeline */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg">Customer Activity Timeline</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Real-time status tracking of your service requests</p>
          </div>
          <button onClick={() => onNavigate("requests")} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
            Manage Requests <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          /* Step-by-Step How KaamFix Works Timeline */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {[
              { step: "01", title: "Select or Describe Issue", desc: "Choose a trade category or use our AI Advisor to describe your household repair.", icon: Search },
              { step: "02", title: "Verified Pro Assigned", desc: "Available local specialists review your request and accept your visit time.", icon: UserCheck },
              { step: "03", title: "Home Inspection & Service", desc: "Your assigned technician arrives with transparent hourly rate quotes.", icon: Wrench },
              { step: "04", title: "Payment & Review", desc: "Mark job as completed, pay directly, and leave authentic star ratings.", icon: ThumbsUp }
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.step} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800/80 space-y-2 relative">
                  <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block">Step {st.step}</span>
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl w-fit">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">{st.title}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {recentRequests.map((req) => (
              <div
                key={req.requestId}
                className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 gap-4 hover:border-orange-500/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/60 rounded-xl text-orange-600 dark:text-orange-400 shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">{req.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{req.serviceCategory} • {req.date.replace("T", " ")}</p>
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {req.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t dark:border-slate-800 md:border-none pt-3 md:pt-0">
                  <div className="flex items-center gap-2">
                    <WorkerAvatar name={req.workerName || "Waiting"} sizeClassName="w-7 h-7 text-[10px]" />
                    <div className="text-left">
                      <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Assigned Pro</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                        {req.workerName || "Waiting for Assignment"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize ${
                      req.status === "completed"
                        ? "bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200/50"
                        : req.status === "accepted" || req.status === "in_progress"
                        ? "bg-stone-50 dark:bg-stone-950/80 text-stone-700 dark:text-stone-400 border border-stone-200/50"
                        : req.status === "pending"
                        ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/50"
                        : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200/50"
                    }`}
                  >
                    {req.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Premium Promotional Banner */}
      <section className="bg-gradient-to-br from-orange-800 via-stone-800 to-stone-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-orange-600/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left max-w-xl">
          <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full backdrop-blur-md">
            AI-Powered Support
          </span>
          <h2 className="text-xl md:text-2xl font-black">
            Need help fast? Let our AI Advisor guide you.
          </h2>
          <p className="text-orange-100 text-xs md:text-sm leading-relaxed">
            Get instant cost estimates, diagnostic advice, and direct worker recommendations for any home maintenance problem.
          </p>
        </div>

        <button
          onClick={() => onNavigate("ai-advisor")}
          className="px-6 py-3.5 bg-white hover:bg-orange-50 text-orange-950 rounded-2xl text-xs font-black shadow-lg transition-all hover:scale-105 shrink-0 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-stone-600" />
          Launch AI Advisor Now
        </button>
      </section>

      {/* 8. Trust Indicators */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Verified Workers", desc: "100% ID & background checked", icon: ShieldCheck, color: "text-orange-600 dark:text-orange-400" },
          { title: "Secure Platform", desc: "Transparent upfront rates", icon: Award, color: "text-stone-600 dark:text-stone-400" },
          { title: "Real Reviews", desc: "Authentic customer ratings", icon: Star, color: "text-amber-500 dark:text-amber-400" },
          { title: "Fast Response", desc: "Prompt local booking dispatch", icon: Clock, color: "text-stone-600 dark:text-stone-400" }
        ].map((tr, idx) => {
          const Icon = tr.icon;
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 ${tr.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">{tr.title}</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">{tr.desc}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* 9. Floating Support Widget (UI only) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowSupportModal(true)}
          className="p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl transition-all duration-200 hover:scale-110 flex items-center gap-2 group border border-orange-400/40"
          title="Customer Live Support"
          aria-label="Customer Live Support"
        >
          <Headphones className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold whitespace-nowrap">
            Customer Support
          </span>
        </button>
      </div>

      {/* Floating Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-100 dark:border-slate-800 shadow-2xl space-y-5 relative"
            >
              <button
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportSubmitted(false);
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/80 rounded-2xl text-orange-600 dark:text-orange-400">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100">KaamFix Helpdesk</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Customer Assistance & Emergency Support</p>
                </div>
              </div>

              {supportSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto" />
                  <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">Message Received!</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Our customer representative will respond to your query shortly.
                  </p>
                  <button
                    onClick={() => {
                      setShowSupportModal(false);
                      setSupportSubmitted(false);
                    }}
                    className="px-5 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-orange-600" /> Helpline: 0800-KAAMFIX
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Available 8:00 AM – 10:00 PM PST</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">How can we assist you today?</label>
                    <textarea
                      rows={3}
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      placeholder="Type your question, booking query, or dispute detail..."
                      className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-xs rounded-xl border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (supportMsg.trim()) {
                        setSupportSubmitted(true);
                        setSupportMsg("");
                      }
                    }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Send Support Message
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}


