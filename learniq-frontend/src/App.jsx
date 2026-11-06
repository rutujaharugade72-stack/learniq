import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import AiTeacher from "./pages/AiTeacher";
import WhyStuck from "./pages/WhyStuck";
import Quiz from "./pages/Quiz";
import History from "./pages/History";
import Activity from "./pages/Activity";
import Materials from "./pages/Materials";
import Notes from "./pages/Notes";
import Planner from "./pages/Planner";
import Assignments from "./pages/Assignments";
import Progress from "./pages/Progress";
import MyCourses from "./pages/MyCourses";
import Achievements from "./pages/Achievements";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ComingSoon from "./pages/ComingSoon";
import { useAuth } from "./context/AuthContext";

// Students get the full app. Teachers and parents get a placeholder for now.
function RoleGate() {
  const { user, logout } = useAuth();
  const role = user?.role || "student"; // older accounts have no role

  if (role !== "student") {
    const label = role === "teacher" ? "Teacher" : "Parent";
    return (
      <div className="role-soon">
        <div className="role-soon-card">
          <h2>{label} dashboard is coming soon</h2>
          <p>
            Hi {user?.name}! The {label.toLowerCase()} view is still being built.
            For now, the full experience is available for student accounts.
          </p>
          <button className="auth-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="signup" element={<Signup />} />
      <Route path="login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <RoleGate />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="ai-teacher" element={<AiTeacher />} />
        <Route path="why-stuck" element={<WhyStuck />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="history" element={<History />} />
        <Route path="activity" element={<Activity />} />
        <Route path="materials" element={<Materials />} />
        <Route path="notes" element={<Notes />} />
        <Route path="planner" element={<Planner />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="progress" element={<Progress />} />
        <Route path="my-courses" element={<MyCourses />} />
        <Route path="courses" element={<Navigate to="/my-courses" replace />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="settings" element={<Settings />} />
        {/* Old links keep working */}
        <Route path="study-planner" element={<Navigate to="/planner" replace />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
}