import React, { useState, useEffect, useRef } from "react";
import { LogOut, LayoutDashboard, Search, Wrench, FileText, User, Bell, Shield, Sparkles, Check, CheckCheck, Sun, Moon, Info, Clock, HelpCircle, MessageSquare } from "lucide-react";
import { UserRole, AppNotification } from "../types";
import { markNotificationAsRead } from "../lib/dbService";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: UserRole | null;
  userName: string;
  onLogout: () => void;
  notifications?: AppNotification[];
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export default function Navbar({
  currentView,
  onNavigate,
  userRole,
  userName,
  onLogout,
  notifications = [],
  theme = "light",
  onToggleTheme
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(unreadNotifications.map((n) => markNotificationAsRead(n.notificationId)));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const formatTimestamp = (createdAt: any) => {
    if (!createdAt) return "Just now";
    
    let dateObj: Date;
    if (typeof createdAt === "object" && createdAt.seconds) {
      dateObj = new Date(createdAt.seconds * 1000);
    } else {
      dateObj = new Date(createdAt);
    }

    if (isNaN(dateObj.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 shadow-sm h-16 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="font-bold text-xl tracking-tight text-orange-700 dark:text-orange-400 flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate(userRole === "worker" ? "worker-dashboard" : userRole === "admin" ? "admin-dashboard" : "dashboard")}>
            <span className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400 shadow-sm border border-orange-500/20">
              <Wrench className="w-5 h-5" />
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-stone-700 dark:from-orange-400 dark:to-stone-300 font-extrabold text-2xl font-display">KaamFix</span>
            {userRole === "worker" && <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 rounded-full border border-orange-200/50">Pro</span>}
            {userRole === "admin" && <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-full border border-rose-200/50">Admin</span>}
          </div>
        </div>

        {/* Desktop Navigation Links */}
        {userRole && (
          <nav className="hidden md:flex items-center gap-2">
            {userRole === "customer" && (
              <>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "dashboard" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Home
                </button>
                <button
                  onClick={() => onNavigate("discovery")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "discovery" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Services
                </button>
                <button
                  onClick={() => onNavigate("ai-advisor")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "ai-advisor" ? "bg-stone-50 dark:bg-stone-950/60 text-stone-700 dark:text-stone-300 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                  AI Advisor
                </button>
                <button
                  onClick={() => onNavigate("requests")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "requests" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  My Requests
                </button>
                <button
                  onClick={() => onNavigate("booking-room")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "booking-room" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Booking Room
                </button>
                <button
                  onClick={() => onNavigate("faq")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "faq" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  FAQ
                </button>
              </>
            )}

            {userRole === "worker" && (
              <>
                <button
                  onClick={() => onNavigate("worker-dashboard")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "worker-dashboard" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate("worker-profile-edit")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "worker-profile-edit" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => onNavigate("booking-room")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "booking-room" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Booking Room
                </button>
                <button
                  onClick={() => onNavigate("faq")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "faq" ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  FAQ
                </button>
              </>
            )}

            {userRole === "admin" && (
              <>
                <button
                  onClick={() => onNavigate("admin-dashboard")}
                  className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                    currentView === "admin-dashboard" ? "bg-stone-50 dark:bg-stone-950/60 text-stone-700 dark:text-stone-300 font-bold" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Dashboard
                </button>
              </>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2 md:gap-3">
          {userName && (
            <span className="hidden lg:inline text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200/50 dark:border-slate-700/50">
              {userName}
            </span>
          )}

          {/* Theme Mode Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-gray-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all flex items-center justify-center"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>
          )}
          
          {/* Notification Center Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-gray-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all relative"
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm z-10">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping opacity-75"></span>
                </>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  id="notification-dropdown"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl py-2 z-50 overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-slate-100">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-full border border-rose-200/50 dark:border-rose-900/40">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-full text-gray-300 dark:text-slate-600">
                          <Bell className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400">All caught up!</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">You don't have any real-time alerts right now.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.notificationId}
                          onClick={(e) => !n.read && handleMarkAsRead(n.notificationId, e)}
                          className={`px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-slate-800/60 flex items-start gap-3 transition-colors cursor-pointer ${
                            !n.read ? "bg-orange-50/30 dark:bg-orange-950/20" : ""
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            !n.read 
                              ? "bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400" 
                              : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
                          }`}>
                            <Info className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs text-gray-700 dark:text-slate-200 leading-relaxed ${!n.read ? "font-bold text-gray-900 dark:text-slate-100" : "font-normal"}`}>
                              {n.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(n.createdAt)}</span>
                            </div>
                          </div>

                          {!n.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.notificationId, e)}
                              className="p-1 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg shrink-0 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {userRole && (
            <button
              onClick={onLogout}
              className="text-gray-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Bottom Nav Bar (Mobile only, shown if customer) */}
      {userRole === "customer" && (
        <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center py-2 pb-safe bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-100 dark:border-slate-800 shadow-lg">
          <button
            onClick={() => onNavigate("dashboard")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "dashboard" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => onNavigate("discovery")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "discovery" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <Search className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Services</span>
          </button>
          <button
            onClick={() => onNavigate("ai-advisor")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative ${
              currentView === "ai-advisor" ? "text-stone-600 dark:text-stone-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5 text-stone-600 dark:text-stone-400" />
            <span className="text-[10px]">AI Advisor</span>
          </button>
          <button
            onClick={() => onNavigate("requests")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "requests" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Requests</span>
          </button>
          <button
            onClick={() => onNavigate("booking-room")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "booking-room" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Room</span>
          </button>
          <button
            onClick={() => onNavigate("faq")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "faq" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <HelpCircle className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">FAQ</span>
          </button>
        </nav>
      )}

      {/* Bottom Nav Bar (Mobile only, shown if worker) */}
      {userRole === "worker" && (
        <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center py-2 pb-safe bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-100 dark:border-slate-800 shadow-lg">
          <button
            onClick={() => onNavigate("worker-dashboard")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "worker-dashboard" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Dashboard</span>
          </button>
          <button
            onClick={() => onNavigate("worker-profile-edit")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "worker-profile-edit" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Edit Profile</span>
          </button>
          <button
            onClick={() => onNavigate("booking-room")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "booking-room" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Room</span>
          </button>
          <button
            onClick={() => onNavigate("faq")}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              currentView === "faq" ? "text-orange-600 dark:text-orange-400 font-bold scale-105" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <HelpCircle className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">FAQ</span>
          </button>
        </nav>
      )}
    </>
  );
}


