import React, { useState, useEffect } from "react";
import { WorkerProfile, SERVICE_CATEGORIES, CITIES, WorkerAvailability } from "../types";
import { Search, Star, MapPin, SlidersHorizontal, Award, Sparkles, X, Calendar, DollarSign, Clock, ShieldCheck, ThumbsUp, CheckCircle, Zap, Shield, HeartHandshake, ArrowRight, ChevronRight, UserCheck, Share2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getWorkers, getReviews, subscribeWorkers } from "../lib/dbService";
import WorkerAvatar from "./WorkerAvatar";
import { WorkerGridSkeleton } from "./Skeletons";

interface ServiceDiscoveryProps {
  onBookService: (category: string, workerId: string, workerName: string) => void;
}

export default function ServiceDiscovery({ onBookService }: ServiceDiscoveryProps) {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [copiedWorkerId, setCopiedWorkerId] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [sortBy, setSortBy] = useState<"rating" | "experience" | "price">("rating");
  const [selectedBudgetPreset, setSelectedBudgetPreset] = useState<"all" | "budget" | "mid" | "premium">("all");
  const [maxPrice, setMaxPrice] = useState<number>(5000);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeWorkers((allWorkers) => {
      const approved = allWorkers.filter((w) => w.status === "approved");
      setWorkers(approved);
      setLoading(false);

      // Check if deep linked workerId is present in URL
      const urlParams = new URLSearchParams(window.location.search);
      const targetWorkerId = urlParams.get("workerId");
      if (targetWorkerId) {
        const found = approved.find((w) => w.uid === targetWorkerId);
        if (found) {
          setSelectedWorker(found);
          fetchWorkerReviews(found.uid);
        }
      }
    });

    return () => unsub();
  }, []);

  const handleShareWorker = async (worker: WorkerProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const shareUrl = `${window.location.origin}${window.location.pathname}?workerId=${worker.uid}`;
    const shareData = {
      title: `${worker.name} - Verified ${worker.category}`,
      text: `Hire ${worker.name}, a verified ${worker.category} in ${worker.city} with ${worker.experience} yrs exp on KaamFix!`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedWorkerId(worker.uid);
      setTimeout(() => {
        setCopiedWorkerId(null);
      }, 2500);
    } catch (err) {
      console.error("Failed to copy share link:", err);
    }
  };

  const fetchWorkerReviews = async (workerId: string) => {
    setLoadingReviews(true);
    try {
      const fetched = await getReviews(workerId);
      setReviews(fetched);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleOpenProfile = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    fetchWorkerReviews(worker.uid);
  };

  const handleCloseProfile = () => {
    setSelectedWorker(null);
    setReviews([]);
  };

  // Filter & Search Logic
  const filteredWorkers = workers.filter((worker) => {
    // 1. Category filter
    if (selectedCategory && (worker.category || "").toLowerCase() !== selectedCategory.toLowerCase()) return false;
    
    // 2. City filter
    if (selectedCity && (worker.city || "").toLowerCase() !== selectedCity.toLowerCase()) return false;

    // 3. Search query
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      const matchName = (worker.name || "").toLowerCase().includes(queryLower);
      const matchCat = (worker.category || "").toLowerCase().includes(queryLower);
      const matchAbout = (worker.about || (worker as any).bio || "").toLowerCase().includes(queryLower);
      if (!matchName && !matchCat && !matchAbout) return false;
    }

    // 4. Availability filter (Available by default)
    if (onlyAvailable && worker.availability !== "available") return false;

    // 5. Preset Budget Filter
    const rate = Number(worker.pricing) || 0;
    if (selectedBudgetPreset === "budget" && rate > 1000) return false;
    if (selectedBudgetPreset === "mid" && (rate < 1000 || rate > 2500)) return false;
    if (selectedBudgetPreset === "premium" && rate < 2500) return false;

    // 6. Max Hourly Rate Slider Filter
    if (maxPrice < 5000 && rate > maxPrice) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "experience") return (b.experience || 0) - (a.experience || 0);
    if (sortBy === "price") return (a.pricing || 0) - (b.pricing || 0);
    return 0;
  });

  return (
    <div className="space-y-10 pb-16">
      
      <AnimatePresence mode="wait">
        {!selectedWorker ? (
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-10"
          >
            {/* Premium Hero Section */}
            <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-stone-950 to-orange-950 p-8 md:p-12 text-white overflow-hidden shadow-2xl border border-stone-800/30">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-stone-500/15 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 max-w-3xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-xs font-bold tracking-wide backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  Pakistan's #1 On-Demand Skilled Trades Network
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
                  Find Vetted Local Pros <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-stone-200 to-stone-300">
                    In Minutes, Not Hours.
                  </span>
                </h1>

                <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                  Book certified electricians, plumbers, HVAC experts, and technicians with transparent hourly rates and 100% satisfaction guarantee.
                </p>

                {/* Hero Search input */}
                <div className="relative max-w-xl mt-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                    <Search className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search for Electrician, Plumber, AC Service, Home Painting..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-white rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-xl transition-all"
                  />
                </div>

                {/* Hero Stats */}
                <div className="pt-4 grid grid-cols-3 gap-4 border-t border-white/10 max-w-lg text-left">
                  <div>
                    <p className="text-xl md:text-2xl font-extrabold text-orange-400">5,000+</p>
                    <p className="text-[11px] text-slate-300 font-medium">Verified Pros</p>
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-extrabold text-amber-400">4.9 ★</p>
                    <p className="text-[11px] text-slate-300 font-medium">Average Rating</p>
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-extrabold text-stone-300">15k+</p>
                    <p className="text-[11px] text-slate-300 font-medium">Completed Jobs</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Service Categories Quick Selector */}
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">Popular Categories</h2>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${
                    selectedCategory === null
                      ? "bg-orange-600 text-white border-transparent shadow-orange-500/20"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                  }`}
                >
                  All Categories
                </button>
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${
                      selectedCategory === cat
                        ? "bg-orange-600 text-white border-transparent shadow-orange-500/20"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-orange-50/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>

            {/* Filter Pills Toolbar */}
            <section className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {/* City Dropdown */}
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-slate-700">
                  <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="border-none bg-transparent font-semibold focus:ring-0 p-0 text-gray-800 dark:text-slate-200 cursor-pointer text-xs"
                  >
                    <option value="">All Cities (Pakistan)</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="h-4 w-[1px] bg-gray-200 dark:bg-slate-800 hidden sm:block"></div>

                {/* Sort By Selector */}
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-slate-700">
                  <SlidersHorizontal className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border-none bg-transparent font-semibold focus:ring-0 p-0 text-gray-800 dark:text-slate-200 cursor-pointer text-xs"
                  >
                    <option value="rating">Top Rated First</option>
                    <option value="experience">Most Experienced</option>
                    <option value="price">Lowest Rate First</option>
                  </select>
                </div>
              </div>

              {/* Availability Filter Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-orange-50/60 dark:bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-100/50 dark:border-orange-900/30">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 border-gray-300 w-4 h-4"
                />
                <span className="text-xs font-bold text-orange-800 dark:text-orange-300">Available Pros Only</span>
              </label>
            </section>

            {/* Budget Tiers & Price Range Slider */}
            <section className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/60 rounded-xl text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Hourly Rate & Budget Filters</h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Refine workers by budget tier or adjust the maximum hourly rate slider</p>
                  </div>
                </div>

                {/* Counter & Clear Price Filters Button */}
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-full text-xs font-bold border border-gray-200/50 dark:border-slate-700">
                    {filteredWorkers.length} {filteredWorkers.length === 1 ? "pro" : "pros"} found
                  </span>
                  {(selectedBudgetPreset !== "all" || maxPrice < 5000) && (
                    <button
                      onClick={() => {
                        setSelectedBudgetPreset("all");
                        setMaxPrice(5000);
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Clear Price Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3 border-t border-gray-100 dark:border-slate-800/80">
                {/* Preset Budget Badges */}
                <div className="lg:col-span-7 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                    Preset Budget Tiers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedBudgetPreset("all");
                        setMaxPrice(5000);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedBudgetPreset === "all" && maxPrice === 5000
                          ? "bg-orange-600 text-white border-transparent shadow-sm"
                          : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      All Budgets
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBudgetPreset("budget");
                        setMaxPrice(1000);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedBudgetPreset === "budget"
                          ? "bg-orange-600 text-white border-transparent shadow-sm"
                          : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      Budget (&le; Rs. 1,000/hr)
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBudgetPreset("mid");
                        setMaxPrice(2500);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedBudgetPreset === "mid"
                          ? "bg-orange-600 text-white border-transparent shadow-sm"
                          : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      Moderate (Rs. 1k - 2.5k)
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBudgetPreset("premium");
                        setMaxPrice(5000);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedBudgetPreset === "premium"
                          ? "bg-orange-600 text-white border-transparent shadow-sm"
                          : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      Premium (Rs. 2.5k+)
                    </button>
                  </div>
                </div>

                {/* Max Hourly Rate Range Slider */}
                <div className="lg:col-span-5 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-800 dark:text-slate-200">Max Hourly Rate</label>
                    <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/80 px-2.5 py-0.5 rounded-lg border border-orange-200/50 dark:border-orange-800/40">
                      {maxPrice >= 5000 ? "Any Rate (Rs. 5,000+)" : `Up to Rs. ${maxPrice.toLocaleString()} / hr`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={500}
                    max={5000}
                    step={100}
                    value={maxPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxPrice(val);
                      setSelectedBudgetPreset("all");
                    }}
                    className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-600 dark:accent-orange-400"
                  />

                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                    <span>Rs. 500/hr</span>
                    <span>Rs. 2,500/hr</span>
                    <span>Rs. 5,000+/hr</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Workers Directory Cards Grid */}
            {loading ? (
              <WorkerGridSkeleton count={6} />
            ) : filteredWorkers.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-slate-200 text-lg">No Matching Professionals Found</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Try resetting your category or city filters to view available workers.</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedCity("");
                    setOnlyAvailable(false);
                    setSearchQuery("");
                    setSelectedBudgetPreset("all");
                    setMaxPrice(5000);
                  }}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredWorkers.map((worker) => (
                    <motion.article
                      key={worker.uid}
                      layout
                      initial={{ opacity: 0, scale: 0.92, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -15, transition: { duration: 0.2, ease: "easeOut" } }}
                      whileHover={{ scale: 1.02, y: -6 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-md dark:shadow-slate-950/50 flex flex-col justify-between hover:shadow-2xl hover:shadow-orange-500/15 dark:hover:shadow-orange-500/20 hover:border-orange-500/40 dark:hover:border-orange-500/50 transition-shadow duration-300 relative overflow-hidden group"
                    >
                    {/* Verified Badge */}
                    {worker.verified && (
                      <div className="absolute top-4 right-4 bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 font-bold text-[10px] px-3 py-1 rounded-full flex items-center gap-1 border border-orange-200/50 dark:border-orange-800/50 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        Verified Pro
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Avatar Header */}
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <WorkerAvatar photoURL={worker.photoURL} profileImage={worker.profileImage} name={worker.name} sizeClassName="w-16 h-16 text-xl" />
                          <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                            worker.availability === "available"
                              ? "bg-orange-500"
                              : worker.availability === "busy"
                              ? "bg-amber-500"
                              : "bg-gray-400"
                          }`} title={`Status: ${worker.availability}`}></span>
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg leading-snug group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{worker.name}</h3>
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mt-0.5">{worker.category}</p>
                          
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold text-gray-900 dark:text-slate-100">{worker.rating || "N/A"}</span>
                            <span className="text-gray-400 dark:text-slate-500">({worker.reviewCount} reviews)</span>
                          </div>
                        </div>
                      </div>

                      {/* Meta info tags */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className="px-2.5 py-1 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-gray-100 dark:border-slate-700">
                          <Award className="w-3 h-3 text-orange-600 dark:text-orange-400" /> {worker.experience} Yrs Exp
                        </span>
                        <span className="px-2.5 py-1 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-gray-100 dark:border-slate-700">
                          <MapPin className="w-3 h-3 text-orange-600 dark:text-orange-400" /> {worker.city}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg capitalize font-bold ${
                          worker.availability === "available"
                            ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40"
                            : worker.availability === "busy"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700"
                        }`}>
                          {worker.availability}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {worker.about}
                      </p>
                    </div>

                    {/* Rate & Action Footer */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider block">Hourly Rate</span>
                        <span className="font-extrabold text-gray-900 dark:text-slate-100 text-base">Rs. {worker.pricing}</span>
                        <span className="text-xs text-gray-400 font-normal"> / hr</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleShareWorker(worker, e)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                            copiedWorkerId === worker.uid
                              ? "bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 shadow-sm"
                              : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600"
                          }`}
                          title="Share Worker Profile"
                          aria-label="Share Worker Profile"
                        >
                          {copiedWorkerId === worker.uid ? (
                            <Check className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenProfile(worker)}
                          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                        >
                          View Profile
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </motion.article>
                ))}
                </AnimatePresence>
              </section>
            )}

            {/* Trust Indicators Section */}
            <section className="bg-gradient-to-r from-orange-900 via-stone-900 to-slate-900 rounded-3xl p-8 text-white space-y-6 shadow-xl border border-orange-800/30">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Why Hire Through KaamFix?</h2>
                <p className="text-xs text-orange-200">Peace of mind for every household repair and trade service.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center space-y-2 backdrop-blur-sm">
                  <ShieldCheck className="w-8 h-8 text-orange-400 mx-auto" />
                  <h3 className="font-bold text-sm">Background Verified</h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">Identity and skill certification thoroughly audited by KaamFix team.</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center space-y-2 backdrop-blur-sm">
                  <Zap className="w-8 h-8 text-amber-400 mx-auto" />
                  <h3 className="font-bold text-sm">Instant Service</h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">Book in under 2 minutes with live status tracking for technician arrival.</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center space-y-2 backdrop-blur-sm">
                  <DollarSign className="w-8 h-8 text-stone-300 mx-auto" />
                  <h3 className="font-bold text-sm">Transparent Pricing</h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">Clear hourly rates with zero hidden extra charges or surprises.</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center space-y-2 backdrop-blur-sm">
                  <HeartHandshake className="w-8 h-8 text-stone-300 mx-auto" />
                  <h3 className="font-bold text-sm">Satisfaction Guaranteed</h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">Dedicated admin arbitration & re-service support if job is incomplete.</p>
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">What Homeowners Say Across Pakistan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex text-amber-400 gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300 italic leading-relaxed">
                    "Booked an electrician in Lahore for an emergency circuit breaker fix. Tariq arrived in 25 minutes and fixed the entire panel cleanly. Outstanding experience!"
                  </p>
                  <div>
                    <span className="font-bold text-xs text-gray-800 dark:text-slate-200 block">Zainab Malik</span>
                    <span className="text-[10px] text-gray-400">Lahore</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex text-amber-400 gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300 italic leading-relaxed">
                    "The AI Advisor feature recommended an AC technician based on my noise description. The pro diagnosed a bad capacitor right away and saved me money."
                  </p>
                  <div>
                    <span className="font-bold text-xs text-gray-800 dark:text-slate-200 block">Usman Ahmed</span>
                    <span className="text-[10px] text-gray-400">Karachi</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex text-amber-400 gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300 italic leading-relaxed">
                    "Very reliable marketplace. Knowing that workers are background verified gives me total peace of mind when hiring plumbing services for my home."
                  </p>
                  <div>
                    <span className="font-bold text-xs text-gray-800 dark:text-slate-200 block">Farhan Siddiqui</span>
                    <span className="text-[10px] text-gray-400">Islamabad</span>
                  </div>
                </div>
              </div>
            </section>

          </motion.div>
        ) : (
          /* Detailed Worker Profile Page */
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            {/* Cover Header */}
            <div className="h-44 bg-gradient-to-r from-orange-800 via-stone-800 to-slate-900 relative">
              <button
                onClick={handleCloseProfile}
                className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Card details */}
            <div className="px-6 md:px-8 pb-8 relative">
              
              {/* Avatar positioning */}
              <div className="absolute -top-14 left-6 md:left-8">
                <WorkerAvatar photoURL={selectedWorker.photoURL} profileImage={selectedWorker.profileImage} name={selectedWorker.name} sizeClassName="w-28 h-28 text-4xl border-4 border-white dark:border-slate-900 shadow-xl" />
              </div>

              <div className="pt-18 space-y-6">
                {/* Header Titles */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-slate-100">{selectedWorker.name}</h2>
                      {selectedWorker.verified && (
                        <span className="bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 border border-orange-200/50">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-1">{selectedWorker.category}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-gray-900 dark:text-slate-100">{selectedWorker.rating || "N/A"}</span>
                        <span className="text-gray-400">({selectedWorker.reviewCount} reviews)</span>
                      </div>
                      <span className="text-gray-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1 font-semibold text-gray-600 dark:text-slate-300">
                        <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" /> {selectedWorker.city}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end bg-orange-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-orange-100/50 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400 tracking-wider">Hourly Rate</span>
                    <div className="text-2xl font-extrabold text-orange-700 dark:text-orange-400">Rs. {selectedWorker.pricing} <span className="text-xs text-gray-500 dark:text-slate-400 font-normal">/ hr</span></div>
                  </div>
                </div>

                {/* Quick Stats Bento */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
                  <div>
                    <Award className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{selectedWorker.experience}+</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">Years Experience</p>
                  </div>
                  <div>
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-orange-700 dark:text-orange-400 capitalize">{selectedWorker.availability}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">Current Availability</p>
                  </div>
                </div>

                {/* About description */}
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm mb-2">About the Professional</h3>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                    {selectedWorker.about}
                  </p>
                </div>

                {/* Reviews Section */}
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm mb-4">Client Reviews</h3>
                  {loadingReviews ? (
                    <div className="py-4 text-xs text-gray-400">Loading reviews...</div>
                  ) : reviews.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No reviews submitted yet for this professional.</p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((rev: any) => (
                        <div key={rev.reviewId} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-gray-800 dark:text-slate-200">{rev.customerName}</span>
                            <div className="flex text-amber-500">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-300 italic">"{rev.review}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCloseProfile}
                    className="flex-1 py-3.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back to Directory
                  </button>
                  <button
                    onClick={(e) => handleShareWorker(selectedWorker, e)}
                    className={`py-3.5 px-4 border rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                      copiedWorkerId === selectedWorker.uid
                        ? "bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
                        : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {copiedWorkerId === selectedWorker.uid ? (
                      <>
                        <Check className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span>Share Profile</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onBookService(selectedWorker.category, selectedWorker.uid, selectedWorker.name);
                      handleCloseProfile();
                    }}
                    disabled={selectedWorker.availability === "offline"}
                    className={`flex-1 py-3.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 ${
                      selectedWorker.availability === "offline"
                        ? "bg-gray-300 dark:bg-slate-700 cursor-not-allowed"
                        : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20"
                    }`}
                  >
                    <Calendar className="w-4 h-4" /> Book Service Now
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


