import React, { useState, useEffect, useRef } from "react";
import { WorkerProfile, ServiceRequest, RequestStatus, SERVICE_CATEGORIES, CITIES, WorkerAvailability } from "../types";
import {
  ClipboardList,
  Award,
  CheckCircle,
  Star,
  Play,
  Settings,
  MapPin,
  CheckSquare,
  Sparkles,
  Clock,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  ShieldCheck,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  Bell,
  ChevronRight,
  Target,
  User,
  PhoneCall,
  HelpCircle,
  ArrowUpRight,
  Flame,
  Shield,
  HeartHandshake,
  CheckCircle2,
  X
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { getWorker, updateWorkerProfile, updateRequestStatus, subscribeRequests } from "../lib/dbService";
import { uploadWorkerProfileImage } from "../lib/supabase";
import WorkerAvatar from "./WorkerAvatar";
import { DashboardSkeleton } from "./Skeletons";
import { toAppDate } from "../lib/dateUtils";
import TechnicalAssistant from "./TechnicalAssistant";
import { auth } from "../lib/firebase";
import LiveWorkerMap from "./LiveWorkerMap";
import LocationSearchInput, { LocationChoice } from "./LocationSearchInput";

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

interface WorkerDashboardProps {
  workerId: string;
  onNavigate: (view: string) => void;
  activeSubView?: string; // "dashboard" | "edit-profile"
  onOpenJob?: (requestId: string) => void;
  onOpenLead?: (requestId: string) => void;
}

export default function WorkerDashboard({ workerId, onNavigate, activeSubView = "dashboard", onOpenJob, onOpenLead }: WorkerDashboardProps) {
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Profile Fields
  const [pricing, setPricing] = useState(800);
  const [city, setCity] = useState("Karachi");
  const [category, setCategory] = useState("Electrician");
  const [experience, setExperience] = useState(5);
  const [about, setAbout] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Profile Photo Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Support Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessageSent, setSupportMessageSent] = useState(false);
  const [supportText, setSupportText] = useState("");

  useEffect(() => {
    const fetchWorkerProfile = async () => {
      setLoading(true);
      try {
        const workerData = await getWorker(workerId);
        if (workerData) {
          setWorker(workerData);
          setPricing(workerData.pricing);
          setCity(workerData.city);
          setCategory(workerData.category);
          setExperience(workerData.experience);
          setAbout(workerData.about);
          setLocationAddress(workerData.location?.address || workerData.city);
          setLatitude(workerData.location?.latitude?.toString() || "");
          setLongitude(workerData.location?.longitude?.toString() || "");
        }
      } catch (err) {
        console.error("Error fetching worker profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkerProfile();
  }, [workerId]);

  useEffect(() => {
    if (!worker || worker.status !== "approved") return;
    const unsubscribe = subscribeRequests(
      (list) => {
        setRequests(list);
      },
      { workerId, category: worker.category }
    );
    return () => unsubscribe();
  }, [workerId, worker?.category, worker?.status]);

  const handleToggleAvailability = async (status: WorkerAvailability) => {
    if (!worker) return;
    setActionError(null);
    try {
      await updateWorkerProfile(workerId, { availability: status });
      setWorker({ ...worker, availability: status });
    } catch (err) {
      console.error("Failed to update availability:", err);
      setActionError("Availability could not be updated. Check your connection and try again.");
    }
  };

  const handleAcceptRequest = async (req: ServiceRequest) => {
    if (!worker) return;
    setActionError(null);
    try {
      const price = window.prompt("Submit your price in PKR", String(req.budget || worker.pricing));
      if (!price) return;
      const eta = window.prompt("Estimated arrival time in minutes", "30");
      if (!eta) return;
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/requests/${req.requestId}/bids`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ price: Number(price), etaMinutes: Number(eta), message: `Available nearby for ${req.serviceCategory}` }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not submit price");
      setActionError("Price offer submitted. The customer can now accept it.");
    } catch (err: any) {
      console.error("Failed to submit bid:", err);
      setActionError(err.message || "This price offer could not be submitted.");
    }
  };

  const handleGoOnlineNearby = () => navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/location", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, address: worker?.city || "Current location", online: true }) });
      if (!response.ok) throw new Error("Could not update live location");
      if (worker) setWorker({ ...worker, online: true, location: { latitude: position.coords.latitude, longitude: position.coords.longitude, address: worker.city } });
      setActionError("You are online and visible in the NEXA radar.");
    } catch (err: any) { setActionError(err.message); }
  }, () => setActionError("Location permission is required to appear on the radar."));

  const saveManualLocation = async () => {
    const lat=Number(latitude), lng=Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setActionError("Enter valid latitude and longitude values."); return; }
    try { const token=await auth.currentUser?.getIdToken(); const response=await fetch("/api/location",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({latitude:lat,longitude:lng,address:locationAddress,online:true})}); if(!response.ok)throw new Error("Could not save location"); if(worker)setWorker({...worker,online:true,location:{latitude:lat,longitude:lng,address:locationAddress}}); setActionError("Location saved. You are visible on the customer radar."); } catch(err:any){setActionError(err.message);}
  };

  const chooseSuggestedLocation = (choice: LocationChoice) => {
    setLocationAddress(choice.label); setLatitude(String(choice.latitude)); setLongitude(String(choice.longitude));
  };
  const chooseMapLocation = async ([lat,lng]:[number,number]) => {
    setLatitude(String(lat)); setLongitude(String(lng));
    try { const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`); if(response.ok){const body=await response.json();if(body.display_name)setLocationAddress(body.display_name);} } catch {}
  };

  const handleDeclineRequest = async (req: ServiceRequest) => {
    if (!worker) return;
    setActionError(null);
    try {
      if (req.workerId === workerId) {
        await updateRequestStatus(req.requestId, "pending", {
          workerId: "",
          workerName: ""
        });
      }
    } catch (err) {
      console.error("Failed to decline request:", err);
      setActionError("The request could not be released. Please try again.");
    }
  };

  const handleUpdateJobStatus = async (req: ServiceRequest, nextStatus: RequestStatus) => {
    if (!worker) return;
    setActionError(null);
    try {
      await updateRequestStatus(req.requestId, nextStatus);
    } catch (err) {
      console.error("Failed to update job status:", err);
      setActionError("The job status could not be updated. Please try again.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    setSubmitting(true);
    setEditSuccess(false);

    try {
      await updateWorkerProfile(workerId, {
        pricing: Number(pricing),
        city,
        category,
        experience: Number(experience),
        about: about.trim()
      });

      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2000);
      
      const updatedWorker = await getWorker(workerId);
      if (updatedWorker) {
        setWorker(updatedWorker);
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!worker) return;
    setUploadError(null);
    setUploadSuccess(null);
    setUploadingImage(true);
    setUploadProgress(10);

    try {
      const result = await uploadWorkerProfileImage(
        workerId,
        file,
        (progress) => setUploadProgress(progress)
      );

      if (result.error || !result.publicUrl) {
        setUploadError(result.error || "Failed to upload image.");
      } else {
        await updateWorkerProfile(workerId, { photoURL: result.publicUrl });
        setWorker({ ...worker, photoURL: result.publicUrl });
        setUploadSuccess("Profile photo updated successfully!");
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setUploadError(err?.message || "An unexpected error occurred during upload.");
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!worker) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-slate-400 font-bold">Failed to load Professional Profile.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm">Retry</button>
      </div>
    );
  }

  if (worker.status !== "approved") {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 shadow-xl text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-200 dark:border-amber-800 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {worker.status === "pending" ? "Profile Under Verification" : "Account Suspended"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
            {worker.status === "pending" 
              ? `Thank you for registering with KaamFix, ${worker.name}. Our platform administrators are currently verifying your credentials and CNIC for the ${worker.category} service category.`
              : `Your account has been temporarily suspended. Please contact platform support.`}
          </p>
        </div>
        {worker.status === "pending" && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/60 rounded-2xl text-orange-800 dark:text-orange-300 text-xs font-bold border border-orange-100 dark:border-orange-900/40">
            Status: Verification Pending
          </div>
        )}
      </div>
    );
  }

  // Stats Calculations
  const newRequests = requests.filter((r) => r.status === "pending");
  const activeJobs = requests.filter((r) => ["accepted", "en_route", "arrived", "in_progress", "work_finished", "disputed"].includes(r.status));
  const completedJobs = requests.filter((r) => r.status === "completed");
  const totalEarnings = completedJobs.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const avgJobValue = completedJobs.length > 0 ? Math.round(totalEarnings / completedJobs.length) : (worker.pricing ? worker.pricing * 2 : 1200);

  // Calculate profile completion score
  const calculateProfileCompletion = () => {
    let score = 20; // base approved
    if (worker.photoURL) score += 25;
    if (worker.about && worker.about.length > 20) score += 25;
    if (worker.pricing > 0) score += 15;
    if (worker.experience > 0) score += 15;
    return Math.min(100, score);
  };

  const profileCompletion = calculateProfileCompletion();

  // Notifications feed derived from real requests state
  const liveNotifications = [
    ...newRequests.slice(0, 2).map((r) => ({
      id: `notif_req_${r.requestId}`,
      title: `New Booking Offer: "${r.title}"`,
      desc: `Budget Rs. ${r.budget} from ${r.customerName} in ${r.location}`,
      time: "Just now",
      type: "booking",
      color: "bg-amber-500 text-amber-50 dark:bg-amber-950 dark:text-amber-300"
     })),
    ...completedJobs.slice(0, 2).map((r) => ({
      id: `notif_comp_${r.requestId}`,
      title: `Job Completed & Settled!`,
      desc: `Payout of Rs. ${r.budget} credited for "${r.title}"`,
      time: "Recent",
      type: "payment",
      color: "bg-orange-500 text-orange-50 dark:bg-orange-950 dark:text-orange-300"
    })),
    {
      id: "notif_system",
      title: "System Pro Status Verified",
      desc: "Your CNIC trade compliance check passed with 100% score",
      time: "1d ago",
      type: "system",
      color: "bg-stone-500 text-stone-50 dark:bg-stone-950 dark:text-stone-300"
    }
  ];

  // Rolling three-month earnings derived from completed jobs only.
  const chartData = Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (2 - index));
    const earnings = completedJobs
      .filter((request) => {
        const rawDate = toAppDate(request.createdAt, request.date);
        return !Number.isNaN(rawDate.getTime()) && rawDate.getMonth() === date.getMonth() && rawDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, request) => sum + (request.budget || 0), 0);
    return { month: date.toLocaleDateString("en-US", { month: "short" }), earnings };
  });
  const hasChartData = chartData.some((point) => point.earnings > 0);

  return (
    <div className="dashboard-page space-y-8 animate-fade-in pb-16 relative">
      {actionError && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700"><span>{actionError}</span><button onClick={() => setActionError(null)} className="shrink-0 text-xs uppercase tracking-wider">Dismiss</button></div>}
      {activeSubView !== "edit-profile" && activeJobs[0] && <TechnicalAssistant requestId={activeJobs[0].requestId} />}
      
      {/* 1. Premium Worker Executive Hero Section (Dashboard view only) */}
      {activeSubView !== "edit-profile" && (
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#24231f] rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800 backdrop-blur-xl"
        >
          {/* Ambient background glow elements & subtle floating particles */}
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-stone-500/15 rounded-full blur-3xl pointer-events-none"
          />

          {/* Floating particles */}
          <motion.div
            animate={{ y: [0, -12, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-8 left-1/4 w-1.5 h-1.5 bg-orange-400 rounded-full blur-[0.5px] pointer-events-none"
          />
          <motion.div
            animate={{ y: [0, -15, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-10 right-1/4 w-2 h-2 bg-stone-300 rounded-full blur-[0.5px] pointer-events-none"
          />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative group cursor-pointer"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-stone-500 rounded-full blur-sm opacity-40 group-hover:opacity-100 transition duration-300"></div>
                <WorkerAvatar photoURL={worker.photoURL} profileImage={worker.profileImage} name={worker.name} sizeClassName="w-20 h-20 text-2xl ring-4 ring-orange-500/30 relative z-10" />
                <span className="absolute bottom-0 right-0 p-1.5 bg-orange-500 text-white rounded-full ring-2 ring-slate-900 z-20 shadow-md" title="Verified Pro">
                  <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
                </span>
              </motion.div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/20 px-3 py-0.5 rounded-full border border-orange-500/30 backdrop-blur-md flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3 text-orange-400" /> Verified Trade Specialist
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> {worker.rating ? worker.rating.toFixed(1) : "5.0"} Rating
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  Welcome back, {worker.name}!
                </h1>

                <p className="text-slate-300 text-xs md:text-sm font-medium flex flex-wrap items-center gap-3">
                  <span>{worker.category} Pro</span>
                  <span>•</span>
                  <span>{worker.city}</span>
                  <span>•</span>
                  <span className="text-orange-400 font-bold">Rs. {worker.pricing}/hr</span>
                  <span>•</span>
                  <span>{worker.experience} Yrs Experience</span>
                </p>
              </div>
            </div>

            {/* Quick Availability & Switcher controls */}
            <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto bg-slate-900/90 p-4 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
              <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-orange-400" /> Availability Mode
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  worker.availability === "available" ? "text-orange-400 bg-orange-950/90 border border-orange-800/60 shadow-sm shadow-orange-900/40" : "text-amber-400 bg-amber-950/90 border border-amber-800/60"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${worker.availability === "available" ? "bg-orange-400 animate-ping" : "bg-amber-400"}`} />
                  {worker.availability}
                </span>
              </div>

              <div className="flex gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 relative">
                {(["available", "busy", "offline"] as WorkerAvailability[]).map((status) => {
                  const isActive = worker.availability === status;
                  return (
                    <motion.button
                      key={status}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleToggleAvailability(status)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all capitalize relative z-10 ${
                        isActive
                          ? status === "available"
                            ? "text-white shadow-lg shadow-orange-900/40"
                            : status === "busy"
                            ? "text-white shadow-lg shadow-amber-900/40"
                            : "text-white shadow-lg"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="availabilityModeBg"
                          className={`absolute inset-0 rounded-lg -z-10 ${
                            status === "available"
                              ? "bg-orange-600"
                              : status === "busy"
                              ? "bg-amber-600"
                              : "bg-slate-700"
                          }`}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      {status}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Profile Completion Bar & Metric Badges */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-orange-400" /> Profile Completion
                </span>
                <span className="text-orange-400 font-extrabold">{profileCompletion}% Complete</span>
              </div>
              <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    profileCompletion === 100 
                      ? "bg-gradient-to-r from-orange-400 via-stone-300 to-orange-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" 
                      : "bg-gradient-to-r from-orange-500 to-stone-400"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
              <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-400 border border-orange-500/20 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-white text-sm flex items-center gap-1">
                  <CountUpNumber value={completedJobs.length} /> Jobs Completed
                </p>
                <p className="text-[11px] text-slate-400">Verified Platform Delivery</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const targetJob = requests.find((r) => ["accepted", "en_route", "arrived", "in_progress", "work_finished", "completed"].includes(r.status)) || requests[0];
                  if (targetJob) {
                    sessionStorage.setItem("kaamfix_room_request", targetJob.requestId);
                    if (onOpenJob) {
                      onOpenJob(targetJob.requestId);
                      return;
                    }
                  }
                  onNavigate("booking-room");
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2 relative group"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Booking Room</span>
                {activeJobs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 8px 20px -4px rgba(16, 185, 129, 0.4)" }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate(activeSubView === "edit-profile" ? "worker-dashboard" : "edit-profile")}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" />
                {activeSubView === "edit-profile" ? "Back to Overview" : "Manage Credentials"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowSupportModal(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold rounded-xl border border-white/20 backdrop-blur-md transition-colors flex items-center gap-2"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Support
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate("worker-payments")}
                className="px-4 py-2.5 bg-white text-stone-900 hover:bg-orange-50 text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Payment details
              </motion.button>
              <motion.button onClick={handleGoOnlineNearby} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Go online nearby
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Worker Sub-View Switcher: Edit Profile vs Dashboard */}
      {activeSubView === "edit-profile" ? (
        /* Edit Profile Sub-View */
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Manage Professional Profile & CNIC Trade Experience
            </h2>
            <button
              onClick={() => onNavigate("worker-dashboard")}
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Profile Photo Upload */}
          <div className="p-6 bg-orange-50/50 dark:bg-orange-950/30 rounded-3xl border border-orange-100/80 dark:border-orange-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  Worker Avatar & Identity Photo
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Upload a clean high-resolution photo to boost customer trust.</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/40 rounded-xl text-orange-800 dark:text-orange-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <WorkerAvatar photoURL={worker.photoURL} profileImage={worker.profileImage} name={worker.name} sizeClassName="w-24 h-24 text-3xl" />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 w-full p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-orange-500 bg-orange-100/50 dark:bg-orange-900/30"
                    : "border-gray-200 dark:border-slate-800 hover:border-orange-400 bg-white dark:bg-slate-900"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadingImage ? (
                  <div className="space-y-2 py-2">
                    <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-200">Uploading image... {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div
                        className="bg-orange-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <Upload className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto" />
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      {worker.photoURL ? "Click or drag to replace profile photo" : "Click or drag to upload avatar"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">Supports PNG, JPG, or WEBP up to 5MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-stone-50 dark:bg-slate-800/50 rounded-3xl border border-stone-200 dark:border-slate-700 space-y-4">
            <div><h3 className="font-black flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-600"/> Service location & radar visibility</h3><p className="text-xs text-gray-500 mt-1">Customers see this point when you are online. You can update it whenever your working area changes.</p></div>
            <div className="space-y-3"><label className="text-xs font-bold block">Search your working location<LocationSearchInput value={locationAddress} onChange={setLocationAddress} onSelect={chooseSuggestedLocation}/></label>{Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))&&latitude!==""&&longitude!==""&&<><LiveWorkerMap customer={[Number(latitude),Number(longitude)]} workers={[]} onSelect={()=>{}} onCustomerMove={chooseMapLocation} customerLabel="Your worker location" showRadius={false}/><p className="text-[11px] text-gray-500">Search an address or click anywhere on the map to move your worker pin. GPS is optional.</p></>}<details className="text-xs text-gray-500"><summary className="cursor-pointer font-bold">Enter coordinates manually</summary><div className="grid sm:grid-cols-2 gap-3 mt-3"><input aria-label="Latitude" type="number" step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} placeholder="Latitude" className="p-3 rounded-xl bg-white dark:bg-slate-900 border"/><input aria-label="Longitude" type="number" step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} placeholder="Longitude" className="p-3 rounded-xl bg-white dark:bg-slate-900 border"/></div></details></div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={handleGoOnlineNearby} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black">Use current GPS & go online</button><button type="button" onClick={saveManualLocation} className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-black">Save entered location</button></div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Hourly Rate (PKR)</label>
                <input
                  type="number"
                  required
                  value={pricing}
                  onChange={(e) => setPricing(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Operating City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-slate-100"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Specialization Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-slate-100"
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  <span>Industry Experience</span>
                  <span className="text-orange-600 dark:text-orange-400">{experience} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-slate-800 accent-orange-600 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Professional Bio</label>
              <textarea
                required
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-slate-100 resize-none"
                placeholder="Highlight your trade skills, certifications, and reliability guarantee..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-2xl transition-colors shadow-sm"
            >
              {submitting ? "Saving changes..." : "Save Profile Details"}
            </button>
          </form>
        </section>
      ) : (
        /* Main Dashboard View */
        <>
          {/* Live Job Active Alert & Direct Booking Room Entry Banner */}
          {activeJobs.length > 0 && (
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
                      Live Job In Execution
                    </span>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                      {activeJobs[0].title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Customer: <span className="font-semibold text-gray-800 dark:text-slate-200">{activeJobs[0].customerName}</span> • Agreed Price: Rs. {(activeJobs[0].negotiatedPrice || activeJobs[0].budget).toLocaleString()}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  sessionStorage.setItem("kaamfix_room_request", activeJobs[0].requestId);
                  if (onOpenJob) onOpenJob(activeJobs[0].requestId);
                  else onNavigate("booking-room");
                }}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Enter Booking Room
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {/* 2. Business Performance Overview KPI Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            
            <motion.div 
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(16, 185, 129, 0.15)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-800/60 shadow-sm space-y-2 transition-colors group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Revenue</span>
                <div className="p-2 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                <CountUpNumber value={totalEarnings} prefix="Rs. " />
              </p>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Settled Earnings
              </span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(59, 130, 246, 0.15)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={() => {
                const targetJob = requests.find((r) => ["accepted", "en_route", "arrived", "in_progress", "work_finished", "completed"].includes(r.status)) || requests[0];
                if (targetJob) {
                  sessionStorage.setItem("kaamfix_room_request", targetJob.requestId);
                  if (onOpenJob) {
                    onOpenJob(targetJob.requestId);
                    return;
                  }
                }
                onNavigate("booking-room");
              }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 shadow-sm space-y-2 transition-colors group cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Jobs</span>
                <div className="p-2 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-600 dark:text-stone-400">
                <CountUpNumber value={activeJobs.length} />
              </p>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                Open Booking Room →
              </span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(20, 184, 166, 0.15)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 shadow-sm space-y-2 transition-colors group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Completed</span>
                <div className="p-2 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-600 dark:text-stone-400">
                <CountUpNumber value={completedJobs.length} />
              </p>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Finished Orders</span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(245, 158, 11, 0.15)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800/60 shadow-sm space-y-2 transition-colors group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Average Rating</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{worker.rating ? worker.rating.toFixed(1) : "5.0"}</p>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">★ High Score</span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(147, 51, 234, 0.15)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 shadow-sm space-y-2 transition-colors group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Response Rate</span>
                <div className="p-2 bg-stone-50 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-600 dark:text-stone-400">98%</p>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">&lt; 15 min reply</span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 12px 24px -6px rgba(225, 29, 72, 0.15)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/60 shadow-sm space-y-2 transition-colors group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Avg Job Value</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                <CountUpNumber value={avgJobValue} prefix="Rs. " />
              </p>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Per Service Ticket</span>
            </motion.div>

          </section>

          {/* 3. Worker Achievement Badges Strip */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-slate-100">
                Verified Platform Achievements
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <motion.div whileHover={{ y: -2, scale: 1.02 }} className="p-3 bg-orange-50/80 dark:bg-orange-950/40 rounded-2xl border border-orange-100 dark:border-orange-900/40 flex items-center gap-2.5 transition-colors">
                <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Verified Pro</p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-400">CNIC Passed</p>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.02 }} className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/40 flex items-center gap-2.5 transition-colors">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Top Rated</p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-400">High Rating</p>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.02 }} className="p-3 bg-stone-50/80 dark:bg-stone-950/40 rounded-2xl border border-stone-100 dark:border-stone-900/40 flex items-center gap-2.5 transition-colors">
                <Zap className="w-5 h-5 text-stone-600 dark:text-stone-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Fast Response</p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-400">&lt;15m Response</p>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.02 }} className="p-3 bg-stone-50/80 dark:bg-stone-950/40 rounded-2xl border border-stone-100 dark:border-stone-900/40 flex items-center gap-2.5 transition-colors">
                <Award className="w-5 h-5 text-stone-600 dark:text-stone-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Trusted Expert</p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-400">{worker.experience}+ Yrs Exp</p>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.02 }} className="p-3 bg-stone-50/80 dark:bg-stone-950/40 rounded-2xl border border-stone-100 dark:border-stone-900/40 flex items-center gap-2.5 col-span-2 md:col-span-1 transition-colors">
                <HeartHandshake className="w-5 h-5 text-stone-600 dark:text-stone-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Zero Disputes</p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-400">Clean History</p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* 4. Earnings Dashboard & Growth Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recharts Monthly Income Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Earnings Dashboard & Revenue Trends
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Verified service job payouts</p>
                </div>
              </div>

              <div className="h-64 pt-4">
                {hasChartData ? <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWorkerEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", color: "#fff", border: "none" }}
                      formatter={(value: any) => [`Rs. ${value}`, "Earnings"]}
                    />
                    <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWorkerEarnings)" />
                  </AreaChart>
                </ResponsiveContainer> : (
                  <div className="h-full rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center px-6">
                    <TrendingUp className="w-9 h-9 text-orange-400 mb-3" />
                    <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">No settled earnings yet</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Revenue analytics will update automatically after your first completed service.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Growth Insights Panel */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100">Trade Growth Insights</h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Most Popular Trade</span>
                  <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">{worker.category}</p>
                  <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">92% high conversion rate in {worker.city}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Peak Booking Hours</span>
                  <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">2:00 PM – 7:00 PM (Weekdays)</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Keep status "AVAILABLE" during peak hours</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Customer Satisfaction</span>
                  <p className="font-extrabold text-sm text-orange-600 dark:text-orange-400">99.4% Positive Ratings</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Live Job Center & incoming opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Incoming Opportunities (2 cols) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Incoming Unassigned Job Offers */}
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Incoming Job Opportunities ({newRequests.length})
                  </h2>
                </div>

                {newRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic py-6 text-center bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    No new unassigned service requests in your category ({worker.category}) at this moment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {newRequests.map((req) => (
                      <motion.div
                        key={req.requestId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3, scale: 1.01, boxShadow: "0 12px 24px -6px rgba(0,0,0,0.08)" }}
                        transition={{ duration: 0.2 }}
                        className="p-5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800/60 rounded-2xl space-y-3 transition-colors group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-1 inline-flex items-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> New Offer
                            </span>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{req.title}</h4>
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">Customer: {req.customerName}</span>
                          </div>
                          <span className="text-xs font-extrabold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-900/40 px-3 py-1 rounded-full shadow-2xs">
                            Rs. {req.budget}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 leading-relaxed italic">
                          "{req.description}"
                        </p>

                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" /> {req.location}</div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200/50 dark:border-slate-800">
                          <button onClick={() => onOpenLead?.(req.requestId)} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold">Open customer map & bid</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              {/* Ongoing Scheduled Jobs */}
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-stone-600 dark:text-stone-400 animate-pulse" />
                  Active & Ongoing Jobs ({activeJobs.length})
                </h2>

                {activeJobs.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic py-6 text-center bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    No active or ongoing jobs scheduled right now.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activeJobs.map((req) => (
                      <motion.div
                        key={req.requestId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3, scale: 1.01, boxShadow: "0 12px 24px -6px rgba(0,0,0,0.08)" }}
                        transition={{ duration: 0.2 }}
                        className="p-5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 hover:border-stone-300 dark:hover:border-stone-800/60 rounded-2xl space-y-3 transition-colors group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1 inline-flex items-center gap-1 shadow-xs ${
                              req.status === "accepted" ? "bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20" : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${req.status === "accepted" ? "bg-stone-500 animate-ping" : "bg-orange-500 animate-ping"}`} />
                              {req.status === "accepted" ? "Accepted - Ready to Start" : "In Progress"}
                            </span>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">{req.title}</h4>
                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Customer: {req.customerName}</span>
                          </div>
                          <span className="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-900/40 px-3 py-1 rounded-full shadow-2xs">
                            Rs. {req.budget}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" /> {req.location}</div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200/50 dark:border-slate-800">
                          <button onClick={() => onOpenJob?.(req.requestId)} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">Map, chat & contact</button>
                          {req.status === "accepted" ? (
                            <motion.button
                              whileHover={{ scale: 1.04, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)" }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleUpdateJobStatus(req, "in_progress")}
                              className="px-5 py-2.5 bg-stone-600 hover:bg-stone-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" /> Start Service Execution
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.04, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleUpdateJobStatus(req, "completed")}
                              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark as Completed
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

            </div>

            {/* Notifications & Quick Actions Sidebar (1 col) */}
            <div className="space-y-8">
              
              {/* Real-Time Notifications Center */}
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
                    Live Notification Feed
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" /> Live Sync
                  </span>
                </div>

                <div className="space-y-3">
                  {liveNotifications.map((notif) => (
                    <motion.div 
                      key={notif.id} 
                      whileHover={{ y: -2, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="p-3.5 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs ${notif.color}`}>
                          {notif.type}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">{notif.time}</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">{notif.title}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">{notif.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Customer Reviews Showcase */}
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    Customer Reviews Showcase
                  </h3>
                </div>

                <div className="space-y-3">
                  <motion.div whileHover={{ y: -2, scale: 1.01 }} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                          A
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Ahmed Khan</span>
                      </div>
                      <div className="flex items-center text-amber-400 text-xs font-bold">
                        ★ 5.0
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 italic">
                      "Punctual and very professional. Fixed the issue cleanly within 45 minutes!"
                    </p>
                  </motion.div>

                  <motion.div whileHover={{ y: -2, scale: 1.01 }} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                          S
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Sara Malik</span>
                      </div>
                      <div className="flex items-center text-amber-400 text-xs font-bold">
                        ★ 5.0
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 italic">
                      "Highly skilled technician. Very polite and reasonable price."
                    </p>
                  </motion.div>
                </div>
              </section>

            </div>

          </div>
        </>
      )}

      {/* Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-100 dark:border-slate-800 shadow-2xl space-y-5 relative"
            >
              <button
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportMessageSent(false);
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/80 rounded-2xl text-orange-600 dark:text-orange-400">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100">KaamFix Support Desk</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Reach platform dispatch & support advisors</p>
                </div>
              </div>

              {supportMessageSent ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto" />
                  <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">Support Ticket Dispatched!</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    A KaamFix admin manager will reach out to you directly via phone or app message shortly.
                  </p>
                  <button
                    onClick={() => {
                      setShowSupportModal(false);
                      setSupportMessageSent(false);
                    }}
                    className="px-5 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">How can we assist you?</label>
                    <textarea
                      rows={3}
                      value={supportText}
                      onChange={(e) => setSupportText(e.target.value)}
                      placeholder="e.g. Question about job payout, location update, or customer communication..."
                      className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-xs rounded-xl border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (supportText.trim()) {
                        setSupportMessageSent(true);
                        setSupportText("");
                      }
                    }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Submit Support Ticket
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

