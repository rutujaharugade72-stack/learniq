import { ArrowRight, Lightbulb, MessageCircle, ListChecks, Brain } from "lucide-react";
import Robot from "../components/Robot";
import AgentCards from "../components/AgentCards";
import ContinueLearning from "../components/ContinueLearning";
import AskAI from "../components/AskAI";
import SidePanel from "../components/SidePanel";

export default function Dashboard() {
  return (
    <div className="dashboard-grid">
      <div className="dash-main">
        {/* Hero banner */}
        <section className="hero">
          <div className="hero-text">
            <h2>Your AI Learning Companion</h2>
            <p>
              Boost your learning with smart AI agents
              <br />
              that help you study, practice and succeed.
            </p>
            <a href="#agents" className="hero-btn">
              Explore Agents <ArrowRight size={18} />
            </a>
          </div>

          <div className="hero-art">
            <span className="float f1"><Lightbulb size={22} /></span>
            <span className="float f2"><MessageCircle size={22} /></span>
            <span className="float f3"><ListChecks size={26} /></span>
            <span className="float f4"><Brain size={26} /></span>
            <Robot size={250} />
          </div>
        </section>

        {/* AI Learning Agents */}
        <AgentCards />

        {/* Continue Learning */}
        <ContinueLearning />

        {/* Ask AI Anything */}
        <AskAI />
      </div>

      {/* Right column */}
      <aside className="dash-side">
        <SidePanel />
      </aside>
    </div>
  );
}