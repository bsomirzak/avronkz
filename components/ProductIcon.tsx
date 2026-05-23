import type { IconName } from "@/lib/products";

const COMMON = {
  className: "product",
  viewBox: "0 0 100 100",
  fill: "none",
  stroke: "#0F1B3D",
  strokeWidth: 2.2,
  strokeLinejoin: "round" as const,
};

export function ProductIcon({ name }: { name: IconName }) {
  switch (name) {
    case "desk":
      return (
        <svg {...COMMON}>
          <rect x="14" y="38" width="72" height="6" rx="1" />
          <line x1="24" y1="44" x2="24" y2="82" />
          <line x1="76" y1="44" x2="76" y2="82" />
          <line x1="22" y1="82" x2="34" y2="82" />
          <line x1="66" y1="82" x2="78" y2="82" />
          <circle cx="73" cy="41" r="1.5" fill="#0F1B3D" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...COMMON}>
          <rect x="14" y="20" width="72" height="48" rx="3" />
          <rect x="20" y="26" width="60" height="36" fill="#0F1B3D" opacity="0.15" />
          <line x1="50" y1="68" x2="50" y2="80" />
          <line x1="38" y1="84" x2="62" y2="84" />
        </svg>
      );
    case "ereader":
      return (
        <svg {...COMMON}>
          <rect x="28" y="14" width="44" height="72" rx="3" />
          <line x1="36" y1="28" x2="64" y2="28" />
          <line x1="36" y1="36" x2="60" y2="36" />
          <line x1="36" y1="44" x2="64" y2="44" />
          <line x1="36" y1="52" x2="56" y2="52" />
          <circle cx="50" cy="76" r="2" />
        </svg>
      );
    case "massager":
      return (
        <svg {...COMMON}>
          <path d="M22 58 Q22 38 50 38 Q78 38 78 58 L78 76 L22 76 Z" />
          <circle cx="36" cy="62" r="3.5" />
          <circle cx="64" cy="62" r="3.5" />
          <path d="M30 50h40" opacity="0.3" />
        </svg>
      );
    case "carplay":
      return (
        <svg {...COMMON}>
          <rect x="18" y="32" width="64" height="36" rx="4" />
          <circle cx="35" cy="50" r="6" />
          <line x1="48" y1="44" x2="74" y2="44" />
          <line x1="48" y1="50" x2="68" y2="50" />
          <line x1="48" y1="56" x2="72" y2="56" />
        </svg>
      );
    case "minipc":
      return (
        <svg {...COMMON}>
          <rect x="22" y="32" width="56" height="36" rx="3" />
          <circle cx="68" cy="50" r="3" fill="#0F1B3D" />
          <line x1="30" y1="42" x2="42" y2="42" />
          <line x1="30" y1="50" x2="44" y2="50" />
          <line x1="30" y1="58" x2="38" y2="58" />
        </svg>
      );
    case "printer":
      return (
        <svg {...COMMON}>
          <rect x="20" y="40" width="60" height="30" rx="2" />
          <rect x="30" y="26" width="40" height="14" rx="1" />
          <rect x="30" y="70" width="40" height="12" rx="1" />
          <circle cx="68" cy="55" r="2" fill="#0F1B3D" />
        </svg>
      );
    case "smartdisplay":
      return (
        <svg {...COMMON}>
          <rect x="10" y="14" width="80" height="56" rx="3" />
          <rect x="18" y="22" width="64" height="40" fill="#0F1B3D" opacity="0.12" />
          <line x1="50" y1="70" x2="50" y2="86" />
          <line x1="32" y1="90" x2="68" y2="90" />
        </svg>
      );
    case "printer3d":
      return (
        <svg {...COMMON}>
          <rect x="20" y="32" width="60" height="50" rx="2" />
          <rect x="30" y="42" width="40" height="28" fill="#0F1B3D" opacity="0.12" />
          <line x1="20" y1="50" x2="80" y2="50" />
          <line x1="50" y1="32" x2="50" y2="50" />
          <line x1="20" y1="36" x2="80" y2="36" />
        </svg>
      );
  }
}
