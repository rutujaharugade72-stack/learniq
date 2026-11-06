import { useLocation } from "react-router-dom";

export default function ComingSoon() {
  const { pathname } = useLocation();
  const title = pathname
    .replace("/", "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="card placeholder">
      <h2>{title}</h2>
      <p>This page is coming soon.</p>
    </div>
  );
}