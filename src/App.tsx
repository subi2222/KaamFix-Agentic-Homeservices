import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { UserProfile, ServiceRequest, AppNotification } from "./types";
import { getRequests, getUserProfile, saveUserProfile, subscribeRequests, subscribeNotifications } from "./lib/dbService";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";

import { MessageSquare } from "lucide-react";
import Navbar from "./components/Navbar";
import LandingPage from "./components/LandingPage";
import CustomerDashboard from "./components/CustomerDashboard";
import ServiceDiscovery from "./components/ServiceDiscovery";
import AIServiceAdvisor from "./components/AIServiceAdvisor";
import RequestServiceForm from "./components/RequestServiceForm";
import MyRequests from "./components/MyRequests";
import WorkerDashboard from "./components/WorkerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import FAQ from "./components/FAQ";
import PaymentCheckout from "./components/PaymentCheckout";
import WorkerPayments from "./components/WorkerPayments";
import NexaRadar from "./components/NexaRadar";
import BookingRoom from "./components/BookingRoom";
import WorkerLeadRoom from "./components/WorkerLeadRoom";

const PATH_TO_VIEW: Record<string, string> = {
  "/app": "dashboard",
  "/app/services": "discovery",
  "/app/ai-advisor": "ai-advisor",
  "/app/book": "book-service",
  "/app/requests": "requests",
  "/app/faq": "faq",
  "/app/payment": "payment",
  "/app/radar": "radar",
  "/app/booking-room": "booking-room",
  "/pro": "worker-dashboard",
  "/pro/profile": "worker-profile-edit",
  "/pro/payments": "worker-payments",
  "/pro/booking-room": "booking-room",
  "/pro/lead": "worker-lead",
  "/pro/faq": "faq",
  "/admin": "admin-dashboard",
};

const ROLE_PATHS: Record<string, string[]> = {
  customer: ["/app", "/app/services", "/app/ai-advisor", "/app/book", "/app/requests", "/app/faq", "/app/payment", "/app/radar", "/app/booking-room"],
  worker: ["/pro", "/pro/profile", "/pro/payments", "/pro/faq", "/pro/booking-room", "/pro/lead"],
  admin: ["/admin"],
};

const homeForRole = (role: string) => role === "worker" ? "/pro" : role === "admin" ? "/admin" : "/app";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Theme Mode State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kaamfix_theme");
      if (saved === "dark" || saved === "light") return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("kaamfix_theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Pre-selected parameters for booking form
  const [bookingCategory, setBookingCategory] = useState<string | null>(null);
  const [bookingWorkerId, setBookingWorkerId] = useState<string | null>(null);
  const [bookingWorkerName, setBookingWorkerName] = useState<string | null>(null);
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingWorkflowId, setBookingWorkflowId] = useState("");
  const [bookingIssueId, setBookingIssueId] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<ServiceRequest | null>(null);
  const [roomRequestId, setRoomRequestId] = useState(() => sessionStorage.getItem("kaamfix_room_request") || "");
  const [leadRequestId, setLeadRequestId] = useState(() => sessionStorage.getItem("kaamfix_lead_request") || "");

  // 1. Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      setAuthError(null);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch custom user profile (role-based schema)
        try {
          const profile = await Promise.race([
            getUserProfile(firebaseUser.uid),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Profile loading timed out")), 8000))
          ]);
          if (profile) {
            setUserProfile(profile);
            localStorage.setItem("kaamfix_last_role", profile.role);
          } else {
            // Repair legacy Firebase accounts that do not yet have an app profile.
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Valued Customer",
              email: firebaseUser.email || "",
              role: "customer",
              createdAt: new Date()
            };
            await saveUserProfile(firebaseUser.uid, fallbackProfile);
            setUserProfile(fallbackProfile);
            localStorage.setItem("kaamfix_last_role", fallbackProfile.role);
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
          // Authentication succeeded, so never trap the user on an infinite loader.
          // Use the most recent locally known role until Firestore becomes available.
          const cachedRole = localStorage.getItem("kaamfix_last_role");
          const fallbackRole = cachedRole === "worker" || cachedRole === "admin" ? cachedRole : "customer";
          const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "KaamFix User",
            email: firebaseUser.email || "",
            role: fallbackRole,
            createdAt: new Date()
          };
          setUserProfile(fallbackProfile);
          setAuthError(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setRequests([]);
        if (window.location.pathname !== "/") navigate("/", { replace: true });
      }
      setLoadingAuth(false);
    }, (error) => {
      console.warn("Auth initialization notice:", error);
      setUser(null);
      setUserProfile(null);
      setAuthError("Authentication could not be initialized. Verify the Firebase configuration and try again.");
      setRequests([]);
      if (window.location.pathname !== "/") navigate("/", { replace: true });
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Keep route authorization separate from asynchronous profile loading. This
  // prevents a late Firebase response from sending a user back to the dashboard
  // after they have already clicked Services, Book Service, or another page.
  useEffect(() => {
    if (!user || !userProfile || loadingAuth) return;
    const allowedPaths = ROLE_PATHS[userProfile.role] || [];
    if (!allowedPaths.includes(location.pathname)) {
      navigate(homeForRole(userProfile.role), { replace: true });
    }
  }, [location.pathname, loadingAuth, navigate, user, userProfile]);

  // Never leave the public marketplace behind an endless Firebase spinner.
  useEffect(() => {
    if (!loadingAuth) return;
    const timer = window.setTimeout(() => {
      setLoadingAuth(false);
      setAuthError("Authentication took too long to initialize. You can still browse the marketplace and try signing in again.");
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [loadingAuth]);

  // 3. Requests & Notifications synchronization
  useEffect(() => {
    if (userProfile) {
      setLoadingRequests(true);
      const filter = userProfile.role === "worker" ? { workerId: userProfile.uid } : { customerId: userProfile.uid };
      const unsubRequests = subscribeRequests(
        (list) => {
          setRequests(list);
          setLoadingRequests(false);
        },
        {
          ...filter,
          onError: () => setLoadingRequests(false)
        }
      );
      return () => unsubRequests();
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      const unsubNotifs = subscribeNotifications(userProfile.uid, (list) => {
        setNotifications(list);
      });
      return () => unsubNotifs();
    }
  }, [userProfile]);

  const fetchCustomerRequests = async () => {
    if (!userProfile) return;
    const latest = await getRequests(userProfile.uid);
    setRequests(latest);
  };

  const handleNavigate = (view: string) => {
    if (view.startsWith("/")) {
      navigate(view);
      return;
    }
    const customerRoutes: Record<string, string> = {
      dashboard: "/app",
      discovery: "/app/services",
      radar: "/app/radar",
      "ai-advisor": "/app/ai-advisor",
      "book-service": "/app/book",
      requests: "/app/requests",
      payment: "/app/payment",
      faq: "/app/faq",
      "booking-room": "/app/booking-room"
    };
    const workerRoutes: Record<string, string> = {
      "worker-dashboard": "/pro",
      "worker-profile-edit": "/pro/profile",
      "edit-profile": "/pro/profile",
      "worker-payments": "/pro/payments",
      payments: "/pro/payments",
      faq: "/pro/faq",
      "booking-room": "/pro/booking-room"
    };
    const adminRoutes: Record<string, string> = { "admin-dashboard": "/admin" };
    const routes = userProfile?.role === "worker" ? workerRoutes : userProfile?.role === "admin" ? adminRoutes : customerRoutes;
    navigate(routes[view] || homeForRole(userProfile?.role || "customer"));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleAuthSuccess = (uid: string, role: string, name: string) => {
    const profile: UserProfile = {
      uid,
      name,
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@example.com`,
      role: role as any,
      createdAt: new Date()
    };
    setUser({ uid, displayName: name, email: profile.email });
    setUserProfile(profile);
    localStorage.setItem("kaamfix_last_role", role);
    navigate(homeForRole(role), { replace: true });
  };

  // Launch Service Booking Page
  const handleLaunchBooking = (category: string, workerId: string, workerName: string) => {
    setBookingCategory(category);
    setBookingWorkerId(workerId);
    setBookingWorkerName(workerName);
    navigate("/app/book");
  };

  const currentView = PATH_TO_VIEW[location.pathname] || (userProfile?.role === "worker" ? "worker-dashboard" : userProfile?.role === "admin" ? "admin-dashboard" : "dashboard");

  // Determine active booking request id fallback for customer/worker
  const activeBookingReq = requests.find((r) =>
    ["accepted", "en_route", "arrived", "in_progress", "work_finished", "completed"].includes(r.status)
  ) || requests[0];
  const effectiveRoomRequestId = roomRequestId || activeBookingReq?.requestId || "";

  useEffect(() => {
    if (currentView === "booking-room" && !roomRequestId && effectiveRoomRequestId) {
      setRoomRequestId(effectiveRoomRequestId);
      sessionStorage.setItem("kaamfix_room_request", effectiveRoomRequestId);
    }
  }, [currentView, roomRequestId, effectiveRoomRequestId]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center space-y-3"
        >
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Starting KaamFix Marketplace...</p>
        </motion.div>
      </div>
    );
  }

  if (user && !userProfile && authError) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center text-xl font-bold">!</div>
          <div>
            <h1 className="text-xl font-extrabold">Workspace unavailable</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{authError}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => window.location.reload()} className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">Try again</button>
            <button onClick={handleLogout} className="py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  // Not Logged In
  if (!user || !userProfile) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <LandingPage onAuthSuccess={handleAuthSuccess} theme={theme} onToggleTheme={handleToggleTheme} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="app-shell min-h-screen text-gray-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Shared Header / Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        userRole={userProfile.role}
        userName={userProfile.name}
        onLogout={handleLogout}
        notifications={notifications}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 pb-24 md:pb-10">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Shared View Routes */}
            {currentView === "faq" && <FAQ onNavigate={handleNavigate} />}

            {/* Customer Routing Views */}
            {userProfile.role === "customer" && (
              <>
                {currentView === "dashboard" && (
                  <CustomerDashboard
                    userName={userProfile.name}
                    requests={requests}
                    onNavigate={handleNavigate}
                    onOpenRoom={(requestId) => {
                      sessionStorage.setItem("kaamfix_room_request", requestId);
                      setRoomRequestId(requestId);
                      navigate("/app/booking-room");
                    }}
                  />
                )}

                {currentView === "discovery" && (
                  <ServiceDiscovery onBookService={handleLaunchBooking} />
                )}

                {currentView === "ai-advisor" && (
                  <AIServiceAdvisor
                    onFindWorkers={(category, summary, workflowId, issueId) => {
                      setBookingCategory(category);
                      setBookingDescription(summary || "");
                      setBookingWorkflowId(workflowId || "");
                      setBookingIssueId(issueId || "");
                      setBookingWorkerId(null);
                      setBookingWorkerName(null);
                      navigate("/app/book");
                    }}
                  />
                )}

                {currentView === "book-service" && (
                  <RequestServiceForm
                    customerId={userProfile.uid}
                    customerName={userProfile.name}
                    preselectedCategory={bookingCategory}
                    preselectedWorkerId={bookingWorkerId}
                    preselectedWorkerName={bookingWorkerName}
                    prefilledDescription={bookingDescription}
                    workflowId={bookingWorkflowId}
                    issueId={bookingIssueId}
                    onBookingComplete={() => {
                      fetchCustomerRequests();
                      navigate("/app/requests");
                    }}
                    onCancel={() => {
                      navigate("/app/services");
                    }}
                  />
                )}

                {currentView === "requests" && (
                  <MyRequests
                    requests={requests}
                    onRefresh={fetchCustomerRequests}
                    onPay={(request) => { setPaymentRequest(request); navigate("/app/payment"); }}
                    onTrack={(request) => { sessionStorage.setItem("kaamfix_room_request", request.requestId); setRoomRequestId(request.requestId); navigate("/app/booking-room"); }}
                  />
                )}

                {currentView === "payment" && (
                  <PaymentCheckout
                    request={paymentRequest}
                    onBack={() => navigate("/app/requests")}
                    onComplete={() => { if(paymentRequest){ sessionStorage.setItem("kaamfix_room_request", paymentRequest.requestId); setRoomRequestId(paymentRequest.requestId); } fetchCustomerRequests(); navigate("/app/booking-room"); }}
                  />
                )}

                {currentView === "radar" && <NexaRadar onAccepted={(request) => { sessionStorage.setItem("kaamfix_room_request", request.requestId); setRoomRequestId(request.requestId); fetchCustomerRequests(); navigate("/app/booking-room"); }} />}
                {currentView === "booking-room" && (effectiveRoomRequestId ? (
                  <BookingRoom requestId={effectiveRoomRequestId} onBack={() => navigate("/app/requests")} onPay={(request) => { setPaymentRequest(request); navigate("/app/payment"); }} />
                ) : !loadingRequests ? (
                  <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl text-center space-y-5">
                    <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/60 rounded-full flex items-center justify-center mx-auto text-orange-600 dark:text-orange-400">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-black text-gray-900 dark:text-slate-100">Live Booking Room</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                        You do not have an active booking session right now. Once a verified pro accepts your service request, live GPS tracking and direct messaging will be available here.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button onClick={() => navigate("/app/services")} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors">
                        Book a Service
                      </button>
                      <button onClick={() => navigate("/app/requests")} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors">
                        View My Requests
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-sm font-semibold text-gray-500">Checking for active booking sessions…</div>
                ))}
              </>
            )}

            {/* Worker Routing Views */}
            {userProfile.role === "worker" && (
              <>
                {currentView === "worker-dashboard" && (
                  <WorkerDashboard
                    workerId={userProfile.uid}
                    onNavigate={handleNavigate}
                    activeSubView="dashboard"
                    onOpenJob={(requestId) => { sessionStorage.setItem("kaamfix_room_request", requestId); setRoomRequestId(requestId); navigate("/pro/booking-room"); }}
                    onOpenLead={(requestId) => { sessionStorage.setItem("kaamfix_lead_request", requestId); setLeadRequestId(requestId); navigate("/pro/lead"); }}
                  />
                )}

                {currentView === "worker-profile-edit" && (
                  <WorkerDashboard
                    workerId={userProfile.uid}
                    onNavigate={handleNavigate}
                    activeSubView="edit-profile"
                    onOpenJob={(requestId) => { sessionStorage.setItem("kaamfix_room_request", requestId); setRoomRequestId(requestId); navigate("/pro/booking-room"); }}
                    onOpenLead={(requestId) => { sessionStorage.setItem("kaamfix_lead_request", requestId); setLeadRequestId(requestId); navigate("/pro/lead"); }}
                  />
                )}

                {currentView === "worker-payments" && (
                  <WorkerPayments onBack={() => navigate("/pro")} />
                )}
                {currentView === "booking-room" && (effectiveRoomRequestId ? (
                  <BookingRoom requestId={effectiveRoomRequestId} onBack={() => navigate("/pro")} />
                ) : !loadingRequests ? (
                  <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl text-center space-y-5">
                    <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/60 rounded-full flex items-center justify-center mx-auto text-orange-600 dark:text-orange-400">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-black text-gray-900 dark:text-slate-100">Live Booking Room</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                        No active service jobs currently in execution. Once you accept a customer request, you can track customer destination, live journey updates, and customer chat here.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button onClick={() => navigate("/pro")} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors">
                        Go to Dashboard
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-sm font-semibold text-gray-500">Checking for active job assignments…</div>
                ))}
                {currentView === "worker-lead" && leadRequestId && <WorkerLeadRoom requestId={leadRequestId} onBack={() => navigate("/pro")} />}
              </>
            )}

            {/* Admin Routing Views */}
            {userProfile.role === "admin" && (
              <>
                {currentView === "admin-dashboard" && <AdminDashboard />}
              </>
            )}
          </motion.div>
        </AnimatePresence>

      </main>

    </div>
  );
}

