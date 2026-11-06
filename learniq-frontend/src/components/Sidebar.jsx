import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import LogoutConfirm from "./LogoutConfirm";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Bot,
  Brain,
  ListChecks,
  CalendarDays,
  NotebookPen,
  BookOpen,
  Library,
  ClipboardList,
  TrendingUp,
  Trophy,
  Award,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

const sections = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "AI AGENTS",
    items: [
      { to: "/ai-teacher", label: "AI Teacher", icon: Bot, badge: "New" },
      { to: "/why-stuck", label: "Why Am I Stuck?", icon: Brain },
      { to: "/quiz", label: "MCQ Generator", icon: ListChecks },
      { to: "/planner", label: "Study Planner", icon: CalendarDays },
      { to: "/notes", label: "Notes & Summary", icon: NotebookPen },
    ],
  },
  {
    title: "LEARNING",
    items: [
      { to: "/my-courses", label: "My Courses", icon: BookOpen },
      { to: "/materials", label: "Materials", icon: Library },
      { to: "/assignments", label: "Assignments", icon: ClipboardList },
      { to: "/progress", label: "Progress", icon: TrendingUp },
    ],
  },
  {
    title: "MORE",
    items: [
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { to: "/achievements", label: "Achievements", icon: Award },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name = user?.name || user?.username || "Student";
  const avatar = user?.avatar || (name[0] ? name[0].toUpperCase() : "C");
  const role = user?.role || "student";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      {/* Brand */}
      <div className="brand">
        <Logo size={44} />
        <div>
          <div className="brand-name">LearnIQ</div>
          <div className="brand-sub">AI Learning Platform</div>
        </div>
      </div>

      {/* Nav List */}
      {sections.map((section, i) => (
        <nav key={i}>
          {section.title && <div className="nav-title">{section.title}</div>}
          {section.items.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge && <span className="badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>
      ))}

      {/* Clickable User Card at Bottom */}
      <div
        className="user-card"
        onClick={() => {
          navigate("/settings");
          if (onNavigate) onNavigate();
        }}
        style={{ cursor: "pointer", transition: "background 0.2s ease" }}
        title="Click to view and edit student profile"
      >
        <div className="user-avatar" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
          {avatar}
        </div>
        <div className="user-info">
          <div className="user-name" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {name}
          </div>
          <div className="user-role">{roleLabel} · View Passport</div>
        </div>
        <button
          type="button"
          className="user-logout"
          onClick={(e) => {
            e.stopPropagation(); // prevent navigation when clicking log out
            setConfirmOpen(true);
          }}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>

      <LogoutConfirm
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={logout}
      />
    </aside>
  );
}