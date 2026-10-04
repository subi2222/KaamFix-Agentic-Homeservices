import React, { useState, useEffect } from "react";
import { WorkerProfile, ServiceRequest, UserProfile } from "../types";
import {
  ShieldAlert,
  Users,
  ClipboardCheck,
  AlertCircle,
  Check,
  X,
  Hourglass,
  Filter,
  Gavel,
  TrendingUp,
  DollarSign,
  Activity,
  Server,
  Database,
  Lock,
  Megaphone,
  Search,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Calendar,
  AlertTriangle,
  Cpu,
  ArrowRight,
  Edit3,
  Star,
  Trash2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { updateWorkerProfile, updateRequestStatus, deleteWorker, subscribeWorkers, subscribeRequests, subscribeUsers } from "../lib/dbService";
import WorkerAvatar from "./WorkerAvatar";
import { DashboardSkeleton } from "./Skeletons";
import EditWorkerModal from "./EditWorkerModal";
import { isFirebaseConfigured } from "../lib/firebase";
import { toAppDate } from "../lib/dateUtils";
import EscalationQueue from "./EscalationQueue";

// Smooth CountUp Number animation component for stats
function CountUpNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000;
    const startVal = 0;
    const endVal = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(easeProgress * (endVal - startVal) + startVal));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };
    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
}

export default function AdminDashboard() {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [workerSearch, setWorkerSearch] = useState<string>("");
  const [requestSearch, setRequestSearch] = useState<string>("");
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "verifications" | "workers" | "requests" | "disputes">("overview");

  // Activity Feed Filter state
  const [feedFilter, setFeedFilter] = useState<"all" | "registration" | "booking" | "worker">("all");

  // Toast Notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Quick Action Modal states
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Edit Worker Modal state
  const [selectedWorkerForEdit, setSelectedWorkerForEdit] = useState<WorkerProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete Worker confirmation modal state
  const [workerToDelete, setWorkerToDelete] = useState<WorkerProfile | null>(null);

  const confirmDeleteWorker = async () => {
    if (!workerToDelete) return;
    const workerId = workerToDelete.uid;
    const workerName = workerToDelete.name;
    setWorkerToDelete(null);

    try {
      console.log(`[AdminDashboard] Safe deleting worker document ${workerId} (${workerName})...`);
      setWorkers((prev) => prev.filter((w) => w.uid !== workerId));

      await deleteWorker(workerId);
      console.log(`[AdminDashboard] Successfully deleted worker document ${workerId} from workers collection.`);
      showToast("success", `Removed worker document for ${workerName} from marketplace.`);
    } catch (err: any) {
      console.error(`[AdminDashboard] Error deleting worker document ${workerId}:`, err);
      showToast("error", `Failed to delete worker: ${err.message || "Unknown error"}`);
    }
  };

  const handleEditWorker = (worker: WorkerProfile) => {
    setSelectedWorkerForEdit(worker);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    setLoading(true);

    const unsubWorkers = subscribeWorkers((list) => {
      setWorkers(list);
    });

    const unsubRequests = subscribeRequests(
      (list) => {
        setRequests(list);
      },
      { isAdmin: true }
    );

    const unsubUsers = subscribeUsers((list) => {
      setUsers(list);
      setLoading(false);
    });

    return () => {
      unsubWorkers();
      unsubRequests();
      unsubUsers();
    };
  }, []);

  const handleApproveWorker = async (workerId: string) => {
    const workerName = workers.find((w) => w.uid === workerId)?.name || "Worker";
    try {
      console.log(`[AdminDashboard] Approving worker ${workerId}...`);
      setWorkers((prev) =>
        prev.map((w) => (w.uid === workerId ? { ...w, status: "approved", verified: true } : w))
      );
      await updateWorkerProfile(workerId, {
        status: "approved",
        verified: true
      });
      console.log(`[AdminDashboard] Status updated to 'approved' for worker ${workerId}`);
      showToast("success", `Approved profile for ${workerName} successfully.`);
    } catch (err: any) {
      console.error(`[AdminDashboard] Error approving worker ${workerId}:`, err);
      showToast("error", `Failed to approve worker: ${err.message || "Unknown error"}`);
    }
  };

  const handleSuspendWorker = async (workerId: string) => {
    const workerName = workers.find((w) => w.uid === workerId)?.name || "Worker";
    try {
      console.log(`[AdminDashboard] Suspending worker ${workerId}...`);
      setWorkers((prev) =>
        prev.map((w) => (w.uid === workerId ? { ...w, status: "suspended", verified: false } : w))
      );
      await updateWorkerProfile(workerId, {
        status: "suspended",
        verified: false
      });
      console.log(`[AdminDashboard] Status updated to 'suspended' for worker ${workerId}`);
      showToast("success", `Suspended profile for ${workerName}.`);
    } catch (err: any) {
      console.error(`[AdminDashboard] Error suspending worker ${workerId}:`, err);
      showToast("error", `Failed to suspend worker: ${err.message || "Unknown error"}`);
    }
  };

  const handleRejectWorker = async (workerId: string) => {
    const workerName = workers.find((w) => w.uid === workerId)?.name || "Worker";
    try {
      console.log(`[AdminDashboard] Rejecting worker ${workerId}...`);
      setWorkers((prev) =>
        prev.map((w) => (w.uid === workerId ? { ...w, status: "rejected", verified: false } : w))
      );
      await updateWorkerProfile(workerId, {
        status: "rejected",
        verified: false
      });
      console.log(`[AdminDashboard] Status updated to 'rejected' for worker ${workerId}`);
      showToast("success", `Rejected trade application for ${workerName}.`);
    } catch (err: any) {
      console.error(`[AdminDashboard] Error rejecting worker ${workerId}:`, err);
      showToast("error", `Failed to reject worker: ${err.message || "Unknown error"}`);
    }
  };

  const handleResolveDispute = async (requestId: string, resolution: "completed" | "cancelled") => {
    try {
      await updateRequestStatus(requestId, resolution);
      setResolvingRequestId(null);
      showToast("success", `Dispute resolved as ${resolution}.`);
    } catch (err: any) {
      console.error("Failed to resolve dispute:", err);
      showToast("error", `Failed to resolve dispute: ${err.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Admin Stats
  const totalUsers = users.length;
  const pendingApprovals = workers.filter((w) => w.status === "pending");
  const approvedWorkers = workers.filter((w) => w.status === "approved");
  const suspendedWorkers = workers.filter((w) => w.status === "suspended");
  const approvedWorkersCount = approvedWorkers.length;
  const completedRequests = requests.filter((r) => r.status === "completed");
  const completedCount = completedRequests.length;
  const activeDisputes = requests.filter((r) => r.status === "disputed");
  const totalGMV = requests
    .filter((r) => r.status === "completed")
    .reduce((acc, curr) => acc + (curr.budget || 0), 0);

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesSearch =
      !requestSearch ||
      r.title.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.customerName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.workerName && r.workerName.toLowerCase().includes(requestSearch.toLowerCase())) ||
      r.location.toLowerCase().includes(requestSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredWorkers = workers.filter((w) => {
    if (!workerSearch) return true;
    const q = workerSearch.toLowerCase();
    return (
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.category && w.category.toLowerCase().includes(q)) ||
      (w.city && w.city.toLowerCase().includes(q)) ||
      (w.status && w.status.toLowerCase().includes(q))
    );
  });

  // Platform activity chart data
  const chartData = Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (2 - index));
    const matching = requests.filter((request) => {
      const rawDate = toAppDate(request.createdAt, request.date);
      return !Number.isNaN(rawDate.getTime()) && rawDate.getMonth() === date.getMonth() && rawDate.getFullYear() === date.getFullYear();
    });
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      volume: matching.length,
      gmv: matching.filter((request) => request.status === "completed").reduce((sum, request) => sum + (request.budget || 0), 0)
    };
  });
  const hasChartData = chartData.some((point) => point.gmv > 0);

  // Category insights aggregation
  const categoryCountMap: Record<string, number> = {};
  requests.forEach((r) => {
    if (r.serviceCategory) {
      categoryCountMap[r.serviceCategory] = (categoryCountMap[r.serviceCategory] || 0) + 1;
    }
  });

  const categoryDistribution = Object.keys(categoryCountMap).map((cat) => ({
    name: cat,
    count: categoryCountMap[cat],
  })).sort((a, b) => b.count - a.count);

  // Top category
  const topCategoryName = categoryDistribution.length > 0 ? categoryDistribution[0].name : "Plumbing";

  // Top rated worker
  const topRatedWorker = [...workers].sort((a, b) => b.rating - a.rating)[0];

  // Live Activity Feed entries aggregated from real data including user registrations and bookings
  const rawActivities = [
    ...users.map((u) => ({
      id: `act_usr_${u.uid}`,
      category: "registration",
      icon: UserPlus,
      iconBg: "bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400",
      title: `New User Registered: ${u.displayName || u.email.split("@")[0]}`,
      subtitle: `${u.role === "worker" ? "Specialist Account" : "Customer Account"} • ${u.email}`,
      time: "Just now",
      badge: u.role.toUpperCase(),
      badgeColor: u.role === "worker" ? "bg-stone-50 text-stone-700 dark:bg-stone-900/40 dark:text-stone-300" : "bg-stone-50 text-stone-700 dark:bg-stone-900/40 dark:text-stone-300"
    })),
    ...requests.map((r) => ({
      id: `act_req_${r.requestId}`,
      category: "booking",
      icon: Calendar,
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
      title: `Service Request: "${r.title}"`,
      subtitle: `By ${r.customerName} in ${r.location}`,
      time: "Recent",
      badge: r.status.replace("_", " ").toUpperCase(),
      badgeColor: r.status === "completed" 
        ? "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" 
        : r.status === "disputed"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    })),
    ...workers.map((w) => ({
      id: `act_wrk_${w.uid}`,
      category: "worker",
      icon: ShieldCheck,
      iconBg: "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400",
      title: `Worker Profile: ${w.name}`,
      subtitle: `${w.category} specialist • ${w.city}`,
      time: "Live Sync",
      badge: w.status.toUpperCase(),
      badgeColor: w.status === "approved" 
        ? "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" 
        : w.status === "pending"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
    }))
  ];

  const filteredActivities = feedFilter === "all"
    ? rawActivities
    : rawActivities.filter((a) => a.category === feedFilter);

  return (
    <div className="dashboard-page space-y-8 animate-fade-in pb-20 relative">
      
      {/* 1. Executive Hero Header */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#24231f] rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800 backdrop-blur-xl"
      >
        {/* Slow moving glow effects and subtle floating particles */}
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none"
        />

        {/* Floating particles */}
        <motion.div
          animate={{ y: [0, -12, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-8 left-1/4 w-1.5 h-1.5 bg-rose-400 rounded-full blur-[0.5px] pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-10 right-1/4 w-2 h-2 bg-orange-400 rounded-full blur-[0.5px] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/20 px-3.5 py-1 rounded-full border border-rose-500/30 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <ShieldAlert className="w-3.5 h-3.5" /> Platform Control Center
              </span>
              <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
                {isFirebaseConfigured ? "Firebase workspace connected" : "Backend configuration required"}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Executive Governance Panel
            </h1>

            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Real-time marketplace monitoring, worker verification queue management, transaction settlement analytics, and customer dispute arbitration.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0 w-full lg:w-auto">
            <motion.button
              whileHover={{ scale: 1.03, y: -2, boxShadow: "0 10px 25px -5px rgba(225, 29, 72, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowBroadcastModal(true)}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <Megaphone className="w-4 h-4 animate-bounce" />
              Broadcast Notification
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab("verifications")}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-extrabold rounded-2xl backdrop-blur-md transition-colors flex items-center justify-center gap-2"
            >
              <Hourglass className="w-4 h-4 text-amber-400" />
              Audits Queue ({pendingApprovals.length})
            </motion.button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Firebase Auth: <strong className={isFirebaseConfigured ? "text-orange-400" : "text-amber-400"}>{isFirebaseConfigured ? "Configured" : "Setup needed"}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Firestore Sync: <strong className="text-orange-400">Connected</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-stone-400 shrink-0" />
            <span>Storage Cloud: <strong className="text-stone-400">Active</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-stone-400 shrink-0" />
            <span>AI Advisor: <strong className="text-stone-400">Online</strong></span>
          </div>
        </div>
      </motion.section>

      {/* 2. Executive Key Metrics Cards Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <motion.div
          onClick={() => setActiveTab("workers")}
          whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(147, 51, 234, 0.15)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 shadow-sm space-y-2 transition-colors cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Users</span>
            <div className="p-2 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
            <CountUpNumber value={totalUsers} />
          </p>
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> Registered Accounts
          </span>
        </motion.div>

        <motion.div
          onClick={() => setActiveTab("workers")}
          whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(16, 185, 129, 0.15)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-800/60 shadow-sm space-y-2 transition-colors cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Pros</span>
            <div className="p-2 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
            <CountUpNumber value={approvedWorkersCount} />
          </p>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Verified Technicians</span>
        </motion.div>

        <motion.div
          onClick={() => setActiveTab("verifications")}
          whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(245, 158, 11, 0.15)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800/60 shadow-sm space-y-2 transition-colors cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Pending Audits</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            <CountUpNumber value={pendingApprovals.length} />
          </p>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Needs CNIC Review</span>
        </motion.div>

        <motion.div
          onClick={() => { setFilterStatus("completed"); setActiveTab("requests"); }}
          whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(59, 130, 246, 0.15)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 shadow-sm space-y-2 transition-colors cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Finished Jobs</span>
            <div className="p-2 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-600 dark:text-stone-400">
            <CountUpNumber value={completedCount} />
          </p>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Service Deliveries</span>
        </motion.div>

        <motion.div
          onClick={() => setActiveTab("disputes")}
          whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(225, 29, 72, 0.15)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/60 shadow-sm space-y-2 transition-colors cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Disputes</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            <CountUpNumber value={activeDisputes.length} />
          </p>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Open Arbitration</span>
        </motion.div>

        <motion.div
          onClick={() => setActiveTab("requests")}
          whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(20, 184, 166, 0.15)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 shadow-sm space-y-2 transition-colors cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Platform GMV</span>
            <div className="p-2 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
            <CountUpNumber value={totalGMV} prefix="Rs. " />
          </p>
          <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">Settled Volume</span>
        </motion.div>
      </section>

      {/* 3. Critical Governance Alerts Banner */}
      {(activeDisputes.length > 0 || pendingApprovals.length > 0 || suspendedWorkers.length > 0) && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shrink-0 shadow-md">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Critical Governance Alerts</h3>
              <p className="text-xs text-gray-600 dark:text-slate-300">
                {pendingApprovals.length} pending CNIC worker application(s), {activeDisputes.length} open customer dispute(s), and {suspendedWorkers.length} suspended account(s) require review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingApprovals.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("verifications")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Audit Workers ({pendingApprovals.length})
              </motion.button>
            )}
            {activeDisputes.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("disputes")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Resolve Disputes ({activeDisputes.length})
              </motion.button>
            )}
          </div>
        </motion.section>
      )}

      {/* 4. Tab Navigation Header Bar */}
      <EscalationQueue />
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-100 dark:border-slate-800 pt-2 relative">
        {[
          { id: "overview", label: "Overview & Analytics", icon: Activity },
          { id: "verifications", label: `Pending Audits (${pendingApprovals.length})`, icon: Hourglass, badge: pendingApprovals.length > 0 ? "urgent" : null },
          { id: "workers", label: `Workers Directory (${workers.length})`, icon: Users },
          { id: "requests", label: `Global Service Logs (${requests.length})`, icon: ClipboardCheck },
          { id: "disputes", label: `Disputes Arbitration (${activeDisputes.length})`, icon: Gavel, badge: activeDisputes.length > 0 ? "dispute" : null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 border relative ${
                isActive
                  ? "text-white border-transparent shadow-md"
                  : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeAdminTab"
                  className="absolute inset-0 bg-rose-600 rounded-2xl -z-10 shadow-md shadow-rose-600/30"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-rose-600 dark:text-rose-400"}`} />
              <span className="relative z-10">{tab.label}</span>
              {tab.badge === "urgent" && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping relative z-10"></span>
              )}
              {tab.badge === "dispute" && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping relative z-10"></span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 5. Clean Tab Content Sections */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Top Row: GMV Trend Chart + Marketplace Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* GMV Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      Gross Merchandise Value (GMV) Trend
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Aggregated settled revenue across all city nodes</p>
                  </div>
                </div>

                <div className="h-64 pt-4">
                  {hasChartData ? <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAdminGMV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", color: "#fff", border: "none" }}
                        formatter={(value: any) => [`Rs. ${value}`, "Platform GMV"]}
                      />
                      <Area type="monotone" dataKey="gmv" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorAdminGMV)" />
                    </AreaChart>
                  </ResponsiveContainer> : (
                    <div className="h-full rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center px-6">
                      <TrendingUp className="w-9 h-9 text-rose-400 mb-3" />
                      <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">Analytics will appear after completed bookings</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm">GMV uses completed service requests only. There are currently no completed requests in Firestore.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights Panel */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100">Marketplace Insights</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                    <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Top Service Trade</span>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">{topCategoryName}</p>
                    <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">Highest customer booking frequency</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                    <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Top Rated Specialist</span>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">{topRatedWorker ? topRatedWorker.name : "Usman Ali"}</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      ★ {topRatedWorker ? topRatedWorker.rating : "5.0"} Star Customer Rating
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                    <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Cities</span>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">Lahore, Karachi, Islamabad, Rawalpindi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Activity Feed (2 cols) + Pending Audits Quick Card (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Activity Feed */}
              <section className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
                      <div className="relative">
                        <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                      </div>
                      Live Marketplace Activity Feed
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Real-time activity stream of user registrations, bookings, and worker updates
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                    {[
                      { id: "all", label: "All Feed" },
                      { id: "registration", label: "Registrations" },
                      { id: "booking", label: "Bookings" },
                      { id: "worker", label: "Workers" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFeedFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                          feedFilter === f.id
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1.5 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {filteredActivities.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400 dark:text-slate-500 italic bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                        No activity entries matching the selected category.
                      </div>
                    ) : (
                      filteredActivities.map((act) => {
                        const Icon = act.icon;
                        return (
                          <motion.div
                            key={act.id}
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ y: -2, scale: 1.01, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                            transition={{ duration: 0.2 }}
                            className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-start justify-between gap-4 transition-colors hover:bg-gray-100/80 dark:hover:bg-slate-800/80 shadow-2xs group"
                          >
                            <div className="flex items-start gap-3.5">
                              <div className={`p-2.5 rounded-xl shrink-0 ${act.iconBg} group-hover:scale-110 transition-transform`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">{act.title}</h4>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">{act.subtitle}</p>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 block pt-0.5">{act.time}</span>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${act.badgeColor} shadow-2xs`}>
                              {act.badge}
                            </span>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Quick Summary Sidebar */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
                      <Hourglass className="w-5 h-5 text-amber-500" />
                      Audits Summary
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 rounded-full">
                      {pendingApprovals.length} Pending
                    </span>
                  </div>

                  {pendingApprovals.length > 0 ? (
                    <div className="space-y-3">
                      {pendingApprovals.slice(0, 2).map((w) => (
                        <div key={w.uid} className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <WorkerAvatar photoURL={w.photoURL} profileImage={w.profileImage} name={w.name} sizeClassName="w-8 h-8 text-xs shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-gray-900 dark:text-slate-100 truncate">{w.name}</p>
                              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">{w.category} • {w.city}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApproveWorker(w.uid)}
                            className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shrink-0"
                            title="Approve Worker"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                      <CheckCircle2 className="w-8 h-8 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300">All verifications up to date!</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab("verifications")}
                  className="w-full py-3 mt-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  Go to Full Audit Queue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Worker Audits & Approvals */}
        {activeTab === "verifications" && (
          <motion.div
            key="verifications-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <Hourglass className="w-5 h-5 text-amber-500" />
                  Worker Verification & CNIC Audit Queue
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Review credentials, trade experience, and CNIC details before approving active listing status.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/50">
                {pendingApprovals.length} Pending Approval(s)
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">All pending trade applications have been audited!</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">New worker profiles submitting CNIC & trade experience will appear here automatically.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map((worker) => (
                  <motion.div 
                    key={worker.uid} 
                    whileHover={{ y: -3, scale: 1.01, boxShadow: "0 12px 24px -6px rgba(0,0,0,0.08)" }}
                    transition={{ duration: 0.2 }}
                    className="p-5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800/60 rounded-2xl space-y-3 relative transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <WorkerAvatar photoURL={worker.photoURL} profileImage={worker.profileImage} name={worker.name} sizeClassName="w-12 h-12 text-base" />
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">{worker.name}</h4>
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">{worker.category} • {worker.experience} Yrs Exp • {worker.city}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 line-clamp-3">
                      "{worker.about || "Trade background details submitted."}"
                    </p>

                    <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-slate-800 justify-end items-center">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditWorker(worker)}
                        className="px-3 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRejectWorker(worker.uid)}
                        className="px-4 py-2 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApproveWorker(worker.uid)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: All Registered Workers Directory */}
        {activeTab === "workers" && (
          <motion.div
            key="workers-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  Registered Service Professionals Directory
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Manage trade partner profiles, approval status, and pricing rates across all active cities.</p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workers by name, city..."
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {filteredWorkers.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic py-8 text-center">No registered worker profiles found matching "{workerSearch}".</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-2">Professional</th>
                      <th className="py-3 px-2">Category</th>
                      <th className="py-3 px-2">City</th>
                      <th className="py-3 px-2">Rate (PKR)</th>
                      <th className="py-3 px-2">Rating</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map((w) => (
                      <tr key={w.uid} className="border-b border-gray-50 dark:border-slate-800/50 text-gray-600 dark:text-slate-300 font-medium">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            <WorkerAvatar photoURL={w.photoURL || w.profileImage} name={w.name} sizeClassName="w-8 h-8 text-xs" />
                            <div>
                              <p className="font-bold text-gray-900 dark:text-slate-100">{w.name}</p>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500">{w.experience} Yrs Exp</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-semibold text-orange-600 dark:text-orange-400">{w.category}</td>
                        <td className="py-3 px-2">{w.city}</td>
                        <td className="py-3 px-2 font-bold text-gray-800 dark:text-slate-200">Rs. {w.pricing}/hr</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            <span>{w.rating ? w.rating.toFixed(1) : "5.0"}</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">({w.reviewCount || 0})</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider capitalize ${
                            w.status === "approved"
                              ? "bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200/50"
                              : w.status === "pending"
                              ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/50"
                              : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200/50"
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditWorker(w)}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/60 text-gray-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 border border-gray-200/60 dark:border-slate-700"
                              title="Edit Worker Profile"
                            >
                              <Edit3 className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                              <span>Edit</span>
                            </button>
                            {w.status === "approved" ? (
                              <button
                                onClick={() => handleSuspendWorker(w.uid)}
                                className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-400 rounded-lg font-bold text-[10px] transition-colors"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproveWorker(w.uid)}
                                className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-[10px] transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => setWorkerToDelete(w)}
                              className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg font-bold text-[10px] transition-colors border border-rose-200/50 dark:border-rose-900/40"
                              title="Delete Worker Document (Safe Delete)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Disputed Requests & Arbitration */}
        {activeTab === "disputes" && (
          <motion.div
            key="disputes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl p-6 md:p-8 border border-rose-100 dark:border-rose-900/40 shadow-sm space-y-5"
          >
            <div>
              <h2 className="font-bold text-rose-800 dark:text-rose-300 text-lg flex items-center gap-2">
                <Gavel className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                Active Disputes Queue (Arbitration)
              </h2>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Arbitrate contested service jobs between customers and assigned trade specialists.</p>
            </div>

            {activeDisputes.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-rose-200 dark:border-rose-900/40 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">No active customer disputes!</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">All customer bookings are proceeding or completed smoothly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDisputes.map((dis) => (
                  <motion.div 
                    key={dis.requestId}
                    whileHover={{ y: -3, scale: 1.01, boxShadow: "0 10px 20px -5px rgba(225, 29, 72, 0.1)" }}
                    transition={{ duration: 0.2 }}
                    className="p-5 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800/80 rounded-2xl space-y-3 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">{dis.title}</h4>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                          Customer: {dis.customerName} | Assigned Worker ID: {dis.workerId || "N/A"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40 px-3 py-1 rounded-full">
                        PKR: Rs. {dis.budget}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800 leading-relaxed italic">
                      "{dis.description}"
                    </p>

                    {resolvingRequestId === dis.requestId ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900/40 flex flex-col md:flex-row gap-3 items-center justify-between"
                      >
                        <span className="text-xs font-bold text-rose-900 dark:text-rose-200">Arbitration Decision:</span>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleResolveDispute(dis.requestId, "cancelled")}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                          >
                            Refund Customer
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleResolveDispute(dis.requestId, "completed")}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                          >
                            Payout Specialist
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setResolvingRequestId(dis.requestId)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Gavel className="w-3.5 h-3.5" /> Resolve Dispute
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Global Activity Log and Filters */}
        {activeTab === "requests" && (
          <motion.div
            key="requests-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  Global Platform Service Logs
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Filter and review all customer bookings, active assignments, and completed jobs across the system.</p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {/* Search input */}
                <div className="relative w-full sm:w-48">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-xl shrink-0">
                  <Filter className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border-none bg-transparent font-bold focus:ring-0 p-0 text-gray-800 dark:text-slate-200 cursor-pointer text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="disputed">Disputed</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic py-8 text-center">No platform requests found under status "{filterStatus}".</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-2">Job Title</th>
                      <th className="py-3 px-2">Customer</th>
                      <th className="py-3 px-2">Worker Assigned</th>
                      <th className="py-3 px-2">Budget</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req.requestId} className="border-b border-gray-50 dark:border-slate-800/50 text-gray-600 dark:text-slate-300 font-medium">
                        <td className="py-3 px-2">
                          <p className="font-bold text-gray-900 dark:text-slate-100">{req.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500">{req.serviceCategory} • {req.location}</p>
                        </td>
                        <td className="py-3 px-2 font-bold text-gray-700 dark:text-slate-300">{req.customerName}</td>
                        <td className="py-3 px-2 font-bold text-orange-600 dark:text-orange-400">{req.workerName || "Unassigned"}</td>
                        <td className="py-3 px-2 font-bold text-gray-900 dark:text-slate-100">Rs. {req.budget}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider capitalize ${
                            req.status === "completed"
                              ? "bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200/50"
                              : req.status === "pending"
                              ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200/50"
                              : req.status === "accepted" || req.status === "in_progress"
                              ? "bg-stone-50 dark:bg-stone-950/80 text-stone-700 dark:text-stone-400 border border-stone-200/50"
                              : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200/50"
                          }`}>
                            {req.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast Notification Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-100 dark:border-slate-800 shadow-2xl space-y-5 relative"
            >
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastSent(false);
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 rounded-2xl text-rose-600 dark:text-rose-400">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100">Broadcast Announcement</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Send system notification to all platform users</p>
                </div>
              </div>

              {broadcastSent ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto" />
                  <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">Announcement Broadcasted!</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    System notice sent successfully to active customer and worker feeds.
                  </p>
                  <button
                    onClick={() => {
                      setShowBroadcastModal(false);
                      setBroadcastSent(false);
                    }}
                    className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Notice Message</label>
                    <textarea
                      rows={3}
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                      placeholder="e.g. KaamFix maintenance update or holiday bonus incentives..."
                      className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-xs rounded-xl border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (broadcastMsg.trim()) {
                        setBroadcastSent(true);
                        setBroadcastMsg("");
                      }
                    }}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Broadcast System Notice
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Worker Profile Modal */}
      <EditWorkerModal
        worker={selectedWorkerForEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWorkerForEdit(null);
        }}
        onWorkerUpdated={(updatedFields) => {
          if (selectedWorkerForEdit) {
            setWorkers((prev) =>
              prev.map((w) =>
                w.uid === selectedWorkerForEdit.uid ? { ...w, ...updatedFields } : w
              )
            );
            showToast("success", `Updated profile for ${updatedFields.name || selectedWorkerForEdit.name}.`);
          }
        }}
      />

      {/* Delete Worker Confirmation Modal */}
      <AnimatePresence>
        {workerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 rounded-2xl border border-rose-100 dark:border-rose-900/40">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100">Delete Worker Profile</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Safe worker deletion</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-slate-300">
                Are you sure you want to delete <strong className="text-gray-900 dark:text-slate-100">{workerToDelete.name}</strong> ({workerToDelete.category})?
                This will remove their document from the <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 font-mono">workers</code> collection and remove them from customer search results.
              </p>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                <strong>Safety Guarantee:</strong> This action only removes the worker document from marketplace listings. User Auth credentials and user profiles remain unchanged.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setWorkerToDelete(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteWorker}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-orange-950/90 text-orange-200 border-orange-800/80"
                : "bg-rose-950/90 text-rose-200 border-rose-800/80"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

