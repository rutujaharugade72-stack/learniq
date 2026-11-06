import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AssistantWidget from "./AssistantWidget";
import ReminderChecker from "./ReminderChecker";
import { AssistantProvider, useAssistant } from "../context/AssistantContext";

// Lives inside AssistantProvider so it can use askAssistant
function TopbarWithAssistant({ onMenuClick }) {
  const { askAssistant } = useAssistant();
  return <Topbar onMenuClick={onMenuClick} onAsk={askAssistant} />;
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <AssistantProvider>
      <div className="app-shell">
        <Sidebar open={open} onNavigate={() => setOpen(false)} />
        {open && <div className="backdrop" onClick={() => setOpen(false)} />}
        <div className="main">
          <TopbarWithAssistant onMenuClick={() => setOpen(true)} />
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
      <AssistantWidget />
      <ReminderChecker />
    </AssistantProvider>
  );
}