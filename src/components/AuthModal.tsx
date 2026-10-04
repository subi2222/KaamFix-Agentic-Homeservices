import React, { useState, useEffect, useRef } from "react";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Briefcase,
  X,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";
import { SERVICE_CATEGORIES, CITIES, UserRole } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: "login" | "signup";
  initialRole?: UserRole;
  onClose: () => void;
  onAuthSuccess: (uid: string, role: string, name: string) => void;
  theme?: "light" | "dark";
}

export default function AuthModal({
  isOpen,
  initialTab = "login",
  initialRole = "customer",
  onClose,
  onAuthSuccess,
  theme = "light"
}: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialTab === "login");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kaamfix_remembered_email") || "";
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Karachi");
  const [category, setCategory] = useState("Electrician");
  const [experience, setExperience] = useState(5);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync tab with prop whenever initialTab or isOpen changes
  useEffect(() => {
    setIsLogin(initialTab === "login");
    setRole(initialRole);
    setError("");
    setResetSent(false);
    setAuthSuccessMsg(null);
  }, [initialTab, initialRole, isOpen]);

  // Handle Escape key and body scroll locking for accessible modal navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "bg-gray-200 dark:bg-slate-800" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-stone-500" };
    return { score: 100, label: "Strong & Secure", color: "bg-orange-500" };
  };

  const pwdStrength = getPasswordStrength(password);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthSuccessMsg(null);
    setLoading(true);

    try {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to .env before signing in.");
      }

      // 1. Core Password Length Validation
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      if (isLogin) {
        // Remember Me Email Handler
        if (rememberMe) {
          localStorage.setItem("kaamfix_remembered_email", email);
        } else {
          localStorage.removeItem("kaamfix_remembered_email");
        }

        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        let storedRole: UserRole = role;
        let displayName = userCredential.user.displayName || email.split("@")[0] || "User";
        try {
          const profileSnapshot = await getDoc(doc(db, "users", uid));
          if (profileSnapshot.exists()) {
            const storedProfile = profileSnapshot.data();
            storedRole = ["customer", "worker", "admin"].includes(storedProfile.role) ? storedProfile.role : role;
            displayName = storedProfile.name || displayName;
          }
        } catch (profileError) {
          console.warn("Signed in, but Firestore profile is temporarily unavailable:", profileError);
        }
        localStorage.setItem("kaamfix_last_role", storedRole);

        setAuthSuccessMsg("Authentication successful! Loading workspace...");
        setTimeout(() => {
          onAuthSuccess(uid, storedRole, displayName);
          onClose();
        }, 600);
      } else {
        // Sign Up Validation: Confirm Password
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match. Please ensure both passwords are identical.");
        }

        if (rememberMe) {
          localStorage.setItem("kaamfix_remembered_email", email);
        }

        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Create Public User Profile
        const userProfile = {
          uid,
          name: fullName,
          email,
          role,
          createdAt: new Date()
        };
        try {
          await setDoc(doc(db, "users", uid), userProfile);
        } catch (profileError) {
          console.warn("Account created, but Firestore user profile sync is unavailable:", profileError);
        }

        // If Worker, create a Worker record (starts as "pending")
        if (role === "worker") {
          const workerProfile = {
            uid,
            name: fullName,
            category,
            city,
            experience: Number(experience) || 5,
            pricing: category === "Electrician" ? 800 : category === "Plumber" ? 700 : 600, // PKR
            rating: 5.0,
            reviewCount: 1,
            verified: false,
            status: "pending",
            availability: "available",
            about: `Skilled ${category} in ${city} with ${experience} years of experience. Fully dedicated to providing quality local maintenance services.`,
            photoURL: "",
            profileImage: "",
            createdAt: new Date()
          };
          try {
            await setDoc(doc(db, "workers", uid), workerProfile);
          } catch (profileError) {
            console.warn("Worker account created, but Firestore worker profile sync is unavailable:", profileError);
          }
        }

        setAuthSuccessMsg("Account created successfully! Welcome to KaamFix.");
        setTimeout(() => {
          onAuthSuccess(uid, role, fullName);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const code = err?.code;
      if (code === "auth/email-already-in-use") {
        setError("This email address is already registered. Please switch to the Login tab to sign in.");
      } else if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found"
      ) {
        setError("Invalid email or password. If you don't have an account yet, click below to register automatically.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Authentication failed. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSignUpWithCurrentCredentials = async () => {
    if (!email || !password) {
      setError("Please fill in both email and password fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setAuthSuccessMsg(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const userName = fullName || email.split("@")[0] || "New User";

      const userProfile = {
        uid,
        name: userName,
        email,
        role,
        createdAt: new Date()
      };
      try {
        await setDoc(doc(db, "users", uid), userProfile);
      } catch (profileError) {
        console.warn("Account created, but Firestore user profile sync is unavailable:", profileError);
      }

      if (role === "worker") {
        const workerProfile = {
          uid,
          name: userName,
          category,
          city,
          experience: Number(experience) || 5,
          pricing: 800,
          rating: 5.0,
          reviewCount: 1,
          verified: true,
          status: "approved",
          availability: "available",
          about: `Skilled ${category} specialist in ${city}.`,
          photoURL: "",
          profileImage: "",
          createdAt: new Date()
        };
        try {
          await setDoc(doc(db, "workers", uid), workerProfile);
        } catch (profileError) {
          console.warn("Worker account created, but Firestore worker profile sync is unavailable:", profileError);
        }
      }

      setAuthSuccessMsg("Account created and signed in successfully!");
      setTimeout(() => {
        onAuthSuccess(uid, role, userName);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error("Auto Sign-up error:", err);
      if (err?.code === "auth/email-already-in-use") {
        setError("This email is already registered with a different password. Please verify your password.");
      } else {
        setError(err.message || "Failed to create account automatically.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setAuthSuccessMsg(null);
    setLoading(true);
    try {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to .env before signing in.");
      }
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      const name = userCredential.user.displayName || "Google User";
      const userEmail = userCredential.user.email || "";

      const profileRef = doc(db, "users", uid);
      let profile: any = { name, role: "customer" };
      try {
        const existingProfile = await getDoc(profileRef);
        if (existingProfile.exists()) {
          profile = existingProfile.data();
        } else {
          await setDoc(profileRef, { uid, name, email: userEmail, role: "customer", createdAt: new Date() });
        }
      } catch (profileError) {
        console.warn("Google sign-in succeeded, but Firestore profile sync is unavailable:", profileError);
      }
      const storedRole: UserRole = ["customer", "worker", "admin"].includes(profile.role)
        ? profile.role
        : "customer";
      const storedName = profile.name || name;
      localStorage.setItem("kaamfix_last_role", storedRole);

      setAuthSuccessMsg("Signed in with Google successfully!");
      setTimeout(() => {
        onAuthSuccess(uid, storedRole, storedName);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Google Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {/* Ambient Glow Effects Behind Modal */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-stone-500/10 rounded-full blur-[140px] pointer-events-none"></div>

          {/* Modal Content Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-gray-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative my-auto space-y-5 text-gray-900 dark:text-slate-100"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer z-10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>KaamFix Secure Portal</span>
              </div>
              <h2
                id="auth-modal-title"
                className="text-2xl font-black text-gray-900 dark:text-white tracking-tight"
              >
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                {isLogin
                  ? "Sign in to access your dashboard and manage service bookings"
                  : "Join Pakistan's leading network of customers & verified trade experts"}
              </p>
            </div>

            {/* Success Notification */}
            <AnimatePresence mode="wait">
              {authSuccessMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/50 rounded-2xl text-orange-800 dark:text-orange-300 text-xs font-bold flex items-center gap-2.5 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span>{authSuccessMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Notification */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-semibold space-y-2 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{error}</p>
                  </div>

                  {error.includes("already registered") && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setError("");
                      }}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm mt-1 cursor-pointer"
                    >
                      Switch to Login Tab
                    </button>
                  )}

                  {(error.includes("Invalid email or password") || error.includes("invalid-credential") || error.includes("register automatically")) && isLogin && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={handleAutoSignUpWithCurrentCredentials}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Create Account Now ({email || "With Entered Credentials"})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          setError("");
                        }}
                        className="w-full py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Switch to Full Registration Form
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password Reset Confirmation Banner */}
            {resetSent && (
              <div className="p-3.5 bg-orange-50 dark:bg-orange-950/60 border-l-4 border-orange-500 rounded-r-2xl text-orange-800 dark:text-orange-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Password reset link sent! Check your email inbox.</span>
              </div>
            )}

            {/* Tab Switcher: Login vs Sign Up */}
            {!resetSent && (
              <div className="relative flex bg-gray-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                  }}
                  className={`relative flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all z-10 cursor-pointer ${
                    isLogin
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {isLogin && (
                    <motion.div
                      layoutId="modalAuthTab"
                      className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200/80 dark:border-slate-700 -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  Login
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                  }}
                  className={`relative flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all z-10 cursor-pointer ${
                    !isLogin
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {!isLogin && (
                    <motion.div
                      layoutId="modalAuthTab"
                      className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200/80 dark:border-slate-700 -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  Sign Up
                </button>
              </div>
            )}

            {/* Role Choice Pills (Sign Up only) */}
            {!isLogin && !resetSent && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Account Role
                </label>
                <div className="relative flex bg-orange-50/60 dark:bg-orange-950/30 p-1 border border-orange-100 dark:border-orange-900/40 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`relative flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all z-10 flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === "customer"
                        ? "text-white"
                        : "text-orange-800 dark:text-orange-300 hover:bg-orange-100/50 dark:hover:bg-orange-900/20"
                    }`}
                  >
                    {role === "customer" && (
                      <motion.div
                        layoutId="modalRoleTab"
                        className="absolute inset-0 bg-orange-600 rounded-xl shadow-md -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <User className="w-3.5 h-3.5" /> Customer
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("worker")}
                    className={`relative flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all z-10 flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === "worker"
                        ? "text-white"
                        : "text-orange-800 dark:text-orange-300 hover:bg-orange-100/50 dark:hover:bg-orange-900/20"
                    }`}
                  >
                    {role === "worker" && (
                      <motion.div
                        layoutId="modalRoleTab"
                        className="absolute inset-0 bg-orange-600 rounded-xl shadow-md -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Briefcase className="w-3.5 h-3.5" /> Trade Worker
                  </button>
                </div>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleAuth} className="space-y-3.5">
              
              {/* Full Name (Sign Up only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                      placeholder="e.g. Tariq Mahmood"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter (Sign Up) */}
                {!isLogin && password.length > 0 && (
                  <div className="mt-2 space-y-1 animate-fade-in">
                    <div className="flex justify-between items-center text-[10px] font-extrabold text-gray-500 dark:text-slate-400">
                      <span>Password Strength</span>
                      <span className={pwdStrength.color.replace("bg-", "text-")}>
                        {pwdStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                        style={{ width: `${pwdStrength.score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password (Sign Up only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember Me Checkbox (Login Tab) */}
              {isLogin && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-gray-300 dark:border-slate-700 focus:ring-orange-500 cursor-pointer accent-orange-600"
                    />
                    <span className="text-xs text-gray-600 dark:text-slate-300 font-semibold">
                      Remember my email
                    </span>
                  </label>
                </div>
              )}

              {/* Worker Specific Fields (Sign Up only) */}
              {!isLogin && role === "worker" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                      Trade Credentials
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-8 pr-2 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="03001234567"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                        City
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <MapPin className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full pl-8 pr-2 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          {CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Primary Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                      <span>Years of Experience</span>
                      <span className="text-orange-600 dark:text-orange-400 font-extrabold">
                        {experience} Years
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      value={experience}
                      onChange={(e) => setExperience(Number(e.target.value))}
                      className="w-full accent-orange-600 cursor-pointer h-2 bg-gray-200 dark:bg-slate-800 rounded-lg"
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isLogin ? (
                  <>
                    <span>Sign In To Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Google Sign-In & Social */}
            <div className="border-t border-gray-200/60 dark:border-slate-800 pt-4 space-y-3">
              <div className="relative text-center">
                <span className="px-3 bg-white dark:bg-slate-900 text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider relative z-10">
                  Or Continue With
                </span>
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-200 dark:bg-slate-800 -z-0"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-gray-700 dark:text-slate-200 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Footer Security Badge */}
            <div className="pt-1 text-center">
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                <span>256-Bit SSL Encrypted & Firebase Auth Protected</span>
              </p>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

