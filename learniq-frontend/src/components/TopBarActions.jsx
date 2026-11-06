import React, { useState, useEffect, useRef } from "react";
import { Bell, Sun, Moon, LogOut, CheckCheck, Trash2, BookOpen, Award, Clock } from "lucide-react";

export default function TopBarActions({ user, onLogout }) {
  // --- 1. THEME TOGGLE STATE & LOGIC ---
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("learniq_theme") === "dark" ||
      (!("learniq_theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("learniq_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("learniq_theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // --- 2. NOTIFICATIONS STATE & LOGIC ---
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Daily Goal Incomplete",
      description: "You have completed 5 out of 10 activities today.",
      time: "10m ago",
      read: false,
      icon: Clock,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      id: 2,
      title: "Study Plan Updated",
      description: "Your study schedule until 2026-11-05 is ready to review.",
      time: "41m ago",
      read: false,
      icon: BookOpen,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: 3,
      title: "Task Verified",
      description: "Task 'Understand: Verification and Validation' marked completed[cite: 8]!",
      time: "2h ago",
      read: false,
      icon: Award,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial =
    user?.name?.[0]?.toUpperCase() ||
    user?.username?.[0]?.toUpperCase() ||
    "C";

  return (
    <div className="relative flex items-center gap-2">
      {/* --- NOTIFICATION BELL BUTTON --- */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setNotificationsOpen((prev) => !prev)}
          aria-label="View notifications"
          className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* --- NOTIFICATION POPUP PANEL --- */}
        {notificationsOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    title="Clear all"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No notifications right now
                </div>
              ) : (
                notifications.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => markAsRead(item.id)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                        item.read
                          ? "opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          : "bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30"
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${item.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- THEME TOGGLE (SUN / MOON) BUTTON --- */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="w-5 h-5 text-slate-600 hover:-rotate-12 transition-transform" />
        )}
      </button>

      {/* --- QUICK LOGOUT BUTTON --- */}
      <button
        onClick={onLogout}
        title="Log out"
        aria-label="Log out"
        className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
      >
        <LogOut className="w-5 h-5" />
      </button>

      {/* --- USER AVATAR BADGE --- */}
      <div
        title={user?.name || user?.username || "Student"}
        className="w-9 h-9 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center text-sm shadow-md cursor-pointer select-none ring-2 ring-indigo-200 dark:ring-indigo-900"
      >
        {userInitial}
      </div>
    </div>
  );
}