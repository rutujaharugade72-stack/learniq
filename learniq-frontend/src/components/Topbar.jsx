import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Menu, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  Bot, 
  CheckCheck, 
  Trash2, 
  Clock, 
  BookOpen, 
  Award,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LogoutConfirm from "./LogoutConfirm";

// Searchable application routes with keywords
const PAGES = [
  { label: "Dashboard", to: "/", words: "home overview main" },
  { label: "AI Teacher", to: "/ai-teacher", words: "tutor agent chat doubt explain help ask classroom" },
  { label: "Why Am I Stuck?", to: "/why-stuck", words: "weak weakness analysis stuck boss diagnosis" },
  { label: "MCQ Generator", to: "/quiz", words: "quiz test practice questions exam generate arena" },
  { label: "Study Planner", to: "/planner", words: "plan schedule calendar tasks study agenda" },
  { label: "Notes & Summary", to: "/notes", words: "notes write summary summarize docs flashcards" },
  { label: "My Courses", to: "/my-courses", words: "courses subjects syllabus enrolled" },
  { label: "Materials", to: "/materials", words: "pdf upload files documents books shelf" },
  { label: "Assignments", to: "/assignments", words: "tasks homework due tracker assignments" },
  { label: "Progress & Mastery", to: "/progress", words: "stats improvement telemetry mastery score" },
  { label: "Leaderboard", to: "/leaderboard", words: "rank xp league campus top podium" },
  { label: "Achievements", to: "/achievements", words: "badges streak trophies milestones unlock" },
  { label: "All Activity", to: "/activity", words: "history recent log feed" },
  { label: "Settings", to: "/settings", words: "goal profile passport password email account" },
];

export default function Topbar({ onMenuClick, onAsk }) {
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(0);

  // --- Theme State ---
  const [isDark, setIsDark] = useState(() => {
    return (
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark" ||
      localStorage.getItem("learniq_theme") === "dark"
    );
  });

  useEffect(() => {
    const saved = localStorage.getItem("learniq_theme");
    const root = document.documentElement;
    if (saved === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      setIsDark(true);
    } else {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    
    if (nextDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("learniq_theme", "dark");
      setIsDark(true);
    } else {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
      localStorage.setItem("learniq_theme", "light");
      setIsDark(false);
    }
  };

  // --- Notification State ---
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Daily Goal Progress",
      description: "Keep going! You're making solid progress on your study plan.",
      time: "10m ago",
      read: false,
      icon: Clock,
    },
    {
      id: 2,
      title: "Study Schedule Active",
      description: "Your daily planner tasks are ready for review.",
      time: "41m ago",
      read: false,
      icon: BookOpen,
    },
    {
      id: 3,
      title: "Verified XP Earned",
      description: "Trophy progress updated on the Campus Leaderboard!",
      time: "2h ago",
      read: false,
      icon: Award,
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

  const displayName = user?.username || user?.name || "Student";

  const q = query.trim().toLowerCase();
  const matches = q
    ? PAGES.filter((p) => `${p.label} ${p.words}`.toLowerCase().includes(q))
    : PAGES.slice(0, 7);

  // Last row: send the text to the AI Teacher
  const rows = [
    ...matches.map((p) => ({ type: "page", page: p })),
    ...(q ? [{ type: "ask", text: query.trim() }] : []),
  ];

  // Ctrl+K shortcut focuses the search box
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes dropdowns
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setListOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(row) {
    if (!row) return;
    if (row.type === "page") {
      navigate(row.page.to);
    } else {
      if (onAsk) {
        onAsk(row.text);
      } else {
        navigate("/ai-teacher");
      }
    }
    setQuery("");
    setListOpen(false);
    setActive(0);
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setListOpen(true);
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(rows[active]);
    } else if (e.key === "Escape") {
      setListOpen(false);
      inputRef.current?.blur();
    }
  }

  // Adaptive style variables based on active dark theme
  const dropdownBg = isDark ? "#0f172a" : "#ffffff";
  const dropdownBorder = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#1e293b";
  const textMuted = isDark ? "#94a3b8" : "#64748b";
  const hoverRowBg = isDark ? "#1e293b" : "#eef2ff";

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="greeting">
        <h1>Welcome back, {displayName}! {"\u{1F44B}"}</h1>
        <p>Ready to learn something amazing today?</p>
      </div>

      <div
        ref={boxRef}
        style={{
          position: "relative",
          marginLeft: "auto",
          flex: "0 1 405px",
          width: "405px",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <label className="search" style={{ width: "100%", boxSizing: "border-box" }}>
          <Search size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages and agents..."
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={handleKeyDown}
          />
          <kbd>Ctrl + K</kbd>
        </label>

        {listOpen && rows.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              margin: 0,
              padding: "6px",
              listStyle: "none",
              background: dropdownBg,
              border: `1.5px solid ${dropdownBorder}`,
              borderRadius: "14px",
              boxShadow: isDark
                ? "0 14px 35px rgba(0,0,0,0.6)"
                : "0 10px 25px rgba(0,0,0,0.12)",
              zIndex: 50,
              maxHeight: "340px",
              overflowY: "auto",
            }}
          >
            {rows.map((row, i) => (
              <li
                key={row.type === "page" ? row.page.to : `ask-${row.text}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(row);
                }}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: textPrimary,
                  background: i === active ? hoverRowBg : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                {row.type === "page" ? (
                  <>
                    <span style={{ flex: 1 }}>{row.page.label}</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: textMuted,
                        background: isDark ? "#1e293b" : "#f1f5f9",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        border: `1px solid ${dropdownBorder}`,
                      }}
                    >
                      {row.page.to}
                    </span>
                  </>
                ) : (
                  <>
                    <Bot size={16} style={{ color: "#818cf8" }} />
                    <span style={{ flex: 1, color: isDark ? "#c7d2fe" : "#4338ca" }}>
                      Ask AI Teacher: "{row.text}"
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Notification Bell & Dropdown --- */}
      <div ref={notifRef} style={{ position: "relative" }}>
        <button 
          className="icon-btn bell-btn" 
          aria-label="Notifications"
          onClick={() => setNotifOpen((prev) => !prev)}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
        </button>

        {notifOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "320px",
              background: dropdownBg,
              border: `1.5px solid ${dropdownBorder}`,
              borderRadius: "14px",
              boxShadow: isDark
                ? "0 14px 35px rgba(0,0,0,0.6)"
                : "0 12px 30px rgba(0,0,0,0.15)",
              zIndex: 60,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: `1px solid ${dropdownBorder}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: textPrimary }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      background: isDark ? "rgba(99, 102, 241, 0.25)" : "#e0e7ff",
                      color: isDark ? "#a5b4fc" : "#4f46e5",
                      padding: "1px 6px",
                      borderRadius: "999px",
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      color: textMuted,
                      display: "flex",
                    }}
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    title="Clear all"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      color: "#ef4444",
                      display: "flex",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Notification Items List */}
            <div style={{ maxHeight: "280px", overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: textMuted, fontSize: "0.85rem" }}>
                  No notifications
                </div>
              ) : (
                notifications.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => markAsRead(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${isDark ? "#1e293b" : "#f8fafc"}`,
                        background: item.read
                          ? "transparent"
                          : isDark
                          ? "rgba(99, 102, 241, 0.12)"
                          : "#f5f3ff",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px",
                          borderRadius: "8px",
                          background: item.read
                            ? isDark
                              ? "#1e293b"
                              : "#f1f5f9"
                            : isDark
                            ? "rgba(99, 102, 241, 0.25)"
                            : "#ede9fe",
                          color: item.read
                            ? textMuted
                            : isDark
                            ? "#a5b4fc"
                            : "#6366f1",
                          marginTop: "2px",
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: textPrimary }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: textMuted }}>
                            {item.time}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: textMuted, lineHeight: 1.3 }}>
                          {item.description}
                        </p>
                      </div>
                      {!item.read && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#6366f1",
                            marginTop: "6px",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Theme Toggle Button --- */}
      <button 
        className="icon-btn" 
        onClick={toggleTheme} 
        aria-label="Toggle theme"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <button
        className="icon-btn"
        onClick={() => setConfirmOpen(true)}
        aria-label="Log out"
        title="Log out"
      >
        <LogOut size={18} />
      </button>

      <div className="avatar">{displayName[0]}</div>

      <LogoutConfirm
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={logout}
      />
    </header>
  );
}