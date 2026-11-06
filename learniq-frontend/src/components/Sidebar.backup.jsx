import { useState } from "react";
import { NavLink } from "react-router-dom";
import Logo from "./Logo";
import LogoutConfirm from "./LogoutConfirm";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Bot, Brain, ListChecks, CalendarDays,
  MessageCircleQuestion, NotebookPen, FileText, ClipboardCheck, BookOpen,
  Library, ClipboardList, TrendingUp, Trophy, Award, Settings, LogOut,
} from "lucide-react";

const sections = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "AI AGENTS",
    items: [
      { to: "/ai-teacher", label: "AI Teacher", icon: Bot, badge: "New" },
      { to: "/why-stuck", label: "Why Am I Stuck?", icon: Brain },
      { to: "/quiz", label: "MCQ Generator", icon: ListChecks },
      { to: "/study-planner", label: "Study Planner", icon: CalendarDays },
      { to: "/doubt-solver", label: "Doubt Solver", icon: MessageCircleQuestion },
      { to: "/notes-assistant", label: "Notes Assistant", icon: NotebookPen },
      { to: "/summarizer", label: "Summarizer", icon: FileText },
      { to: "/quiz-coach", label: "Quiz Coach", icon: ClipboardCheck },
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name = user?.username || user?.name || "Student";
  const role = user?.role || "student";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <Logo size={44} />
        <div>
          <div className="brand-name">LearnIQ</div>
          <div className="brand-sub">AI Learning Platform</div>
        </div>
      </div>

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

      <div className="user-card">
        <div className="user-avatar">{name[0]}</div>
        <div className="user-info">
          <div className="user-name">{name}</div>
          <div className="user-role">{roleLabel}</div>
        </div>
        <button
          type="button"
          className="user-logout"
          onClick={() => setConfirmOpen(true)}
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