export default function Logo({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lq-body" x1="22" y1="56" x2="78" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5a4df0" />
          <stop offset="1" stopColor="#7c6df8" />
        </linearGradient>
        <linearGradient id="lq-tl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5e6ee" />
          <stop offset="1" stopColor="#4fb3d6" />
        </linearGradient>
        <linearGradient id="lq-tr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6cc4e6" />
          <stop offset="1" stopColor="#2f8fd0" />
        </linearGradient>
      </defs>

      {/* body */}
      <path
        d="M22 56 L50 70 L78 56 V80 L50 93 L22 80 Z"
        fill="url(#lq-body)"
        stroke="url(#lq-body)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="79" r="2.2" fill="#d9d5ff" />
      <circle cx="60" cy="79" r="2.2" fill="#d9d5ff" />

      {/* tassels */}
      <path d="M11 46 C9 52 8.5 62 9 68 A2 2 0 0 0 13 68 C13.5 62 13 52 11 46 Z" fill="url(#lq-tl)" />
      <path d="M89 46 C87 52 86.5 62 87 68 A2 2 0 0 0 91 68 C91.5 62 91 52 89 46 Z" fill="url(#lq-tr)" />

      {/* cap, with a white outline so it separates from the body */}
      <g stroke="#fff" strokeWidth="4.5" strokeLinejoin="round" paintOrder="stroke">
        <path d="M24 40 V50 L50 64 L76 50 V40 Z" fill="#1c1870" />
        <path d="M50 7 L95 32 L50 57 L5 32 Z" fill="#231f80" />
      </g>
      <path d="M24 40 V50 L50 64 L76 50 V40 Z" fill="#1c1870" stroke="#1c1870" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 7 L95 32 L50 57 L5 32 Z" fill="#231f80" stroke="#231f80" strokeWidth="1.5" strokeLinejoin="round" />

      {/* cord and button */}
      <path d="M50 31 L82 37" stroke="#8f8ae6" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="50" cy="31" r="3.4" fill="#fff" />
    </svg>
  );
}