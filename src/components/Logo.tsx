export default function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Corona de círculos */}
      <circle cx="60" cy="26" r="14" fill="#7C3AED" />
      <circle cx="37" cy="32" r="10.5" fill="#9F7AEA" />
      <circle cx="83" cy="32" r="10.5" fill="#9F7AEA" />
      <circle cx="20" cy="44" r="7.5" fill="#C4B5FD" />
      <circle cx="100" cy="44" r="7.5" fill="#C4B5FD" />
      {/* Arco */}
      <path
        d="M14 66 Q 60 48 106 66"
        stroke="#8B5CF6"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Billetera */}
      <rect x="30" y="76" width="60" height="34" rx="11" fill="#3A2A5E" />
      <path
        d="M30 88 a11 11 0 0 1 11-12 h38 a11 11 0 0 1 11 12 v1 H30 z"
        fill="#4A3878"
      />
      <circle cx="80" cy="93" r="5.5" fill="#EAB308" />
    </svg>
  );
}
