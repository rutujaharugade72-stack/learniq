export default function Robot({ size = 240 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rb-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe6fb" />
        </linearGradient>
        <linearGradient id="rb-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7cff" />
          <stop offset="1" stopColor="#3a4fe0" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="226" rx="52" ry="7" fill="#000" opacity="0.12" />

      {/* waving arm */}
      <path d="M74 150 C56 146 44 132 42 112" stroke="#dfe6fb" strokeWidth="13" strokeLinecap="round" />
      <path d="M74 150 C56 146 44 132 42 112" stroke="url(#rb-white)" strokeWidth="10" strokeLinecap="round" />
      <circle cx="42" cy="108" r="9" fill="url(#rb-white)" />

      {/* body */}
      <rect x="80" y="134" width="80" height="78" rx="30" fill="url(#rb-white)" />
      <rect x="98" y="152" width="44" height="10" rx="5" fill="#c9d3f5" />
      <circle cx="120" cy="180" r="6" fill="#4f7cff" />

      {/* book */}
      <g transform="rotate(-8 160 186)">
        <rect x="132" y="168" width="58" height="42" rx="5" fill="url(#rb-blue)" />
        <rect x="137" y="173" width="48" height="32" rx="3" fill="#eef2ff" />
        <path d="M161 173 V205" stroke="#c7d2fe" strokeWidth="2" />
        <path
          d="M143 181 H156 M143 187 H156 M143 193 H156 M166 181 H179 M166 187 H179"
          stroke="#a5b4fc"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* arm holding the book */}
      <path d="M158 150 C170 160 176 176 170 192" stroke="#dfe6fb" strokeWidth="13" strokeLinecap="round" />
      <path d="M158 150 C170 160 176 176 170 192" stroke="url(#rb-white)" strokeWidth="10" strokeLinecap="round" />

      {/* headphones */}
      <path d="M66 96 C66 58 174 58 174 96" stroke="#3a4fe0" strokeWidth="7" strokeLinecap="round" />
      <rect x="56" y="88" width="16" height="32" rx="8" fill="url(#rb-blue)" />
      <rect x="168" y="88" width="16" height="32" rx="8" fill="url(#rb-blue)" />

      {/* head and face */}
      <rect x="70" y="66" width="100" height="74" rx="30" fill="url(#rb-white)" />
      <rect x="80" y="76" width="80" height="54" rx="22" fill="#16184a" />
      <ellipse cx="103" cy="99" rx="8" ry="10" fill="#38bdf8" />
      <ellipse cx="137" cy="99" rx="8" ry="10" fill="#38bdf8" />
      <circle cx="106" cy="95" r="2.6" fill="#fff" />
      <circle cx="140" cy="95" r="2.6" fill="#fff" />
      <path d="M110 114 Q120 122 130 114" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />

      {/* graduation cap */}
      <path d="M120 24 L172 48 L120 70 L68 48 Z" fill="#1f2470" stroke="#1f2470" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 58 V72 C90 78 150 78 150 72 V58 L120 70 Z" fill="#171a5c" />
      <path d="M168 50 V72" stroke="#f5b83d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="168" cy="76" r="4" fill="#f5b83d" />
    </svg>
  );
}