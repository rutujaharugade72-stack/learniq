import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";

// Popup that matches the LearnIQ design. Used by Topbar and Sidebar.
export default function LogoutConfirm({ open, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="lo-overlay" onClick={onCancel}>
      <div
        className="lo-card"
        role="dialog"
        aria-modal="true"
        aria-label="Log out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lo-icon">
          <LogOut size={26} />
        </div>
        <h3>Log out of LearnIQ?</h3>
        <p>Your quizzes and progress are saved. You can log back in any time.</p>
        <div className="lo-actions">
          <button type="button" className="lo-btn ghost" onClick={onCancel}>
            Stay
          </button>
          <button type="button" className="lo-btn" onClick={onConfirm}>
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}