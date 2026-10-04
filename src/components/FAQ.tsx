import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  HelpCircle,
  ChevronDown,
  Search,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Wrench,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  CheckCircle2
} from "lucide-react";

interface FAQItem {
  id: string;
  category: "customer" | "worker" | "payments" | "safety";
  question: string;
  answer: string;
  tags?: string[];
}

const FAQ_DATA: FAQItem[] = [
  // Customer Questions
  {
    id: "c1",
    category: "customer",
    question: "How do I book a verified service professional on KaamFix?",
    answer: "You can easily browse workers in the 'Find Services' tab by trade, city, availability, rating, and hourly rate. Click 'Book Service', fill out your location and problem details, and submit your request. Workers in your area will receive your request immediately.",
    tags: ["Booking", "Customers", "Getting Started"]
  },
  {
    id: "c2",
    category: "customer",
    question: "How does the AI Service Advisor help me?",
    answer: "Our AI Service Advisor allows you to describe home maintenance issues in natural language or photo descriptions. It diagnoses potential causes, estimates costs, and automatically matches you with verified specialists in your area.",
    tags: ["AI", "Diagnosis", "Cost Estimate"]
  },
  {
    id: "c3",
    category: "customer",
    question: "Are the service professionals background-checked and verified?",
    answer: "Yes! Every worker on KaamFix goes through identity validation, document verification (ID card, certificates, background checks), and admin review before receiving a 'Verified Professional' badge.",
    tags: ["Safety", "Verification", "Trust"]
  },
  {
    id: "c4",
    category: "customer",
    question: "What if I am unsatisfied with the service provided?",
    answer: "KaamFix provides a service guarantee. You can leave detailed reviews and ratings. If an issue arises, you can open a dispute or request assistance through customer support directly from your request management screen.",
    tags: ["Guarantee", "Support", "Ratings"]
  },

  // Worker Questions
  {
    id: "w1",
    category: "worker",
    question: "How do service workers sign up and get jobs?",
    answer: "Workers can register during account sign-up by selecting 'Service Worker', completing their profile with skills, rates, and experience, and uploading verification documents. Once approved by our admin team, job requests in their area appear live on their dashboard.",
    tags: ["Workers", "Onboarding", "Jobs"]
  },
  {
    id: "w2",
    category: "worker",
    question: "How do I set my hourly rate and availability status?",
    answer: "You can update your hourly rates, bio, trade skills, and toggle your status between 'Available Now', 'Busy', or 'Offline' at any time from the 'Edit Profile' section in your worker dashboard.",
    tags: ["Pricing", "Profile", "Availability"]
  },
  {
    id: "w3",
    category: "worker",
    question: "How do I accept or complete a service request?",
    answer: "When a customer submits a request matching your trade, it appears in your 'Incoming Requests' feed. You can review job details and click 'Accept Request'. Once the work is done, mark the status as 'Completed' to receive customer ratings.",
    tags: ["Jobs", "Workflow", "Earnings"]
  },

  // Payments & Pricing
  {
    id: "p1",
    category: "payments",
    question: "How are service costs calculated?",
    answer: "Workers display clear hourly rates upfront (e.g. Rs. 800 - Rs. 2,500/hr). You can filter worker directory cards by budget tiers or max hourly price sliders to ensure full transparency before booking.",
    tags: ["Pricing", "Transparency", "Rates"]
  },
  {
    id: "p2",
    category: "payments",
    question: "Is there any hidden fee for booking through KaamFix?",
    answer: "No hidden fees. You see the transparent rate proposed by the worker before confirming your request. Detailed receipts are recorded directly in your service request log.",
    tags: ["Billing", "No Hidden Fees"]
  },

  // Safety & Platform Rules
  {
    id: "s1",
    category: "safety",
    question: "What measures protect my home and privacy?",
    answer: "Customer addresses are only shared with the specific worker assigned to an accepted booking. Notifications keep you informed in real-time at every step of the service lifecycle.",
    tags: ["Privacy", "Security", "Address Protection"]
  },
  {
    id: "s2",
    category: "safety",
    question: "How do ratings and reviews work?",
    answer: "Ratings on KaamFix are 100% authentic and verified. Only customers with completed service requests can submit ratings and written feedback for workers.",
    tags: ["Reviews", "Authenticity", "Community"]
  }
];

interface FAQProps {
  onNavigate?: (view: string) => void;
}

export default function FAQ({ onNavigate }: FAQProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(["c1", "w1"]));
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchesQuery =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesQuery;
  });

  const handleFeedback = (id: string) => {
    setFeedbackGiven((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-orange-900 via-orange-800 to-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-orange-700/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-orange-500/20 backdrop-blur-md rounded-full text-orange-300 text-xs font-bold border border-orange-400/30">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            <span>Help Center & FAQs</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
            Frequently Asked Questions
          </h1>

          <p className="text-orange-100/80 text-sm md:text-base leading-relaxed">
            Find fast answers to common questions about booking services, worker verification, pricing, safety, and platform guidelines.
          </p>

          {/* Search Bar inside Hero */}
          <div className="relative pt-2">
            <Search className="w-5 h-5 absolute left-4 top-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions by keyword, topic, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-2xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: "all", label: "All Questions", icon: HelpCircle },
          { id: "customer", label: "For Customers", icon: UserCheck },
          { id: "worker", label: "For Workers", icon: Wrench },
          { id: "payments", label: "Pricing & Billing", icon: CreditCard },
          { id: "safety", label: "Safety & Trust", icon: ShieldCheck },
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap border shrink-0 ${
                isActive
                  ? "bg-orange-600 text-white border-transparent shadow-md scale-102"
                  : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-orange-600 dark:text-orange-400"}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-gray-100 dark:border-slate-800 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-200">No questions found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              We couldn't find any questions matching "{searchQuery}". Try searching for terms like "booking", "worker", "pricing", or "verification".
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Clear Search Filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.has(faq.id);
            const isHelpful = feedbackGiven[faq.id];

            return (
              <div
                key={faq.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-orange-500/40 dark:border-orange-500/50 shadow-md ring-1 ring-orange-500/10"
                    : "border-gray-100 dark:border-slate-800 shadow-sm hover:border-gray-200 dark:hover:border-slate-700"
                }`}
              >
                {/* Accordion Header / Question Button */}
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full text-left p-5 md:p-6 flex items-start justify-between gap-4 group cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/40">
                        {faq.category}
                      </span>
                      {faq.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {faq.question}
                    </h3>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className={`p-2 rounded-xl shrink-0 mt-1 transition-colors ${
                      isOpen
                        ? "bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                {/* Accordion Body with Smooth Height Animation */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-5 pb-6 md:px-6 md:pb-6 pt-0 border-t border-gray-100 dark:border-slate-800/80 space-y-4">
                        <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 leading-relaxed pt-4">
                          {faq.answer}
                        </p>

                        {/* Was this helpful? footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-800/50 text-[11px] text-gray-400 dark:text-slate-500">
                          <span>Was this answer helpful?</span>
                          {isHelpful ? (
                            <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Thanks for your feedback!
                            </span>
                          ) : (
                            <button
                              onClick={() => handleFeedback(faq.id)}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/50 hover:text-orange-600 text-gray-600 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3" /> Yes, helpful
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Still need help CTA */}
      <div className="bg-gradient-to-r from-orange-50 via-stone-50 to-stone-50 dark:from-slate-900 dark:via-slate-900 dark:to-stone-950/40 rounded-3xl p-6 md:p-8 border border-orange-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="p-3.5 bg-orange-600 text-white rounded-2xl shrink-0 shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Still have questions?</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Ask our AI Service Advisor to diagnose your household issues or guide your booking.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("ai-advisor")}
            className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            Launch AI Advisor
          </button>
        )}
      </div>
    </section>
  );
}

