/**
 * Technical line illustrations for Method section.
 * Same craft language as pro tools (hairline stroke, canvas fill) —
 * but original geometry, not Linear’s plates / cubes / receding bars.
 */

const INK = '#C8CDD6'
const INK_MID = '#6A707A'
const INK_DIM = '#3A3E46'
const FILL = '#050505'

function SoftShadow({ id }: { id: string }) {
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="bg" />
      <feColorMatrix
        in="SourceAlpha"
        result="hardAlpha"
        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
      />
      <feOffset dy="3" />
      <feGaussianBlur stdDeviation="5" />
      <feComposite in2="hardAlpha" operator="out" />
      <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.45 0" />
      <feBlend in2="bg" result="shadow" />
      <feBlend in="SourceGraphic" in2="shadow" result="shape" />
    </filter>
  )
}

/** Brief / idea form — clipboard with fields (describe) */
export function FigDescribe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" fill="none" className={className} aria-hidden>
      {/* Desk plane */}
      <path stroke={INK_DIM} strokeWidth="0.6" d="M28 158 H212" strokeLinecap="round" />
      <path stroke={INK_DIM} strokeWidth="0.5" opacity="0.5" d="M40 168 H200" strokeLinecap="round" />

      <g filter="url(#vfig-brief-shadow)">
        {/* Clipboard body */}
        <path
          fill={FILL}
          stroke={INK}
          strokeWidth="0.7"
          d="M58 42 H182 Q190 42 190 50 V148 Q190 156 182 156 H58 Q50 156 50 148 V50 Q50 42 58 42 Z"
        />
        {/* Clip */}
        <path
          fill={FILL}
          stroke={INK_MID}
          strokeWidth="0.7"
          d="M98 34 H142 Q150 34 150 42 V52 H90 V42 Q90 34 98 34 Z"
        />
        <circle cx="120" cy="43" r="3.5" stroke={INK} strokeWidth="0.6" fill={FILL} />
      </g>

      {/* Form fields */}
      <path stroke={INK_MID} strokeWidth="0.6" strokeLinecap="round" d="M68 72 H172" />
      <path stroke={INK_DIM} strokeWidth="0.55" strokeLinecap="round" d="M68 88 H148" />
      <path stroke={INK_DIM} strokeWidth="0.55" strokeLinecap="round" d="M68 104 H160" />
      <rect x="68" y="118" width="72" height="18" rx="2" stroke={INK_MID} strokeWidth="0.6" fill="none" />
      <path stroke={INK} strokeWidth="0.6" strokeLinecap="round" d="M78 127 H124" />

      {/* Corner mark */}
      <path stroke={INK_DIM} strokeWidth="0.5" d="M170 128 H182 V140" />

      <defs>
        <SoftShadow id="vfig-brief-shadow" />
      </defs>
    </svg>
  )
}

/** Review intake — funnel into evidence tray (collect) */
export function FigCollect({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" fill="none" className={className} aria-hidden>
      {/* Incoming source nodes */}
      {[
        { x: 48, y: 36 },
        { x: 120, y: 28 },
        { x: 192, y: 36 },
      ].map((n) => (
        <g key={`${n.x}-${n.y}`}>
          <circle cx={n.x} cy={n.y} r="7" stroke={INK_MID} strokeWidth="0.65" fill={FILL} />
          <circle cx={n.x} cy={n.y} r="2.2" fill={INK_DIM} />
        </g>
      ))}

      {/* Feed lines into funnel */}
      <path stroke={INK_DIM} strokeWidth="0.55" d="M48 43 L100 78" />
      <path stroke={INK_DIM} strokeWidth="0.55" d="M120 35 L120 78" />
      <path stroke={INK_DIM} strokeWidth="0.55" d="M192 43 L140 78" />

      {/* Funnel */}
      <g filter="url(#vfig-funnel-shadow)">
        <path
          fill={FILL}
          stroke={INK}
          strokeWidth="0.7"
          d="M78 78 H162 L138 118 H102 Z"
        />
        <path fill={FILL} stroke={INK_MID} strokeWidth="0.65" d="M102 118 H138 V148 H102 Z" />
      </g>

      {/* Evidence tray */}
      <path
        fill={FILL}
        stroke={INK}
        strokeWidth="0.65"
        d="M56 152 H184 V176 H56 Z"
      />
      <path stroke={INK_DIM} strokeWidth="0.5" strokeLinecap="round" d="M68 160 H140" />
      <path stroke={INK_DIM} strokeWidth="0.5" strokeLinecap="round" d="M68 168 H120" />
      <path stroke={INK_MID} strokeWidth="0.55" strokeLinecap="round" d="M156 164 H172" />

      <defs>
        <SoftShadow id="vfig-funnel-shadow" />
      </defs>
    </svg>
  )
}

/** Verdict gauge — arc meter + needle (decide) */
export function FigDecide({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" fill="none" className={className} aria-hidden>
      {/* Base */}
      <path stroke={INK_DIM} strokeWidth="0.55" d="M52 168 H188" strokeLinecap="round" />
      <path
        fill={FILL}
        stroke={INK_MID}
        strokeWidth="0.65"
        d="M100 168 H140 L132 152 H108 Z"
      />

      {/* Gauge body */}
      <g filter="url(#vfig-gauge-shadow)">
        <path
          fill={FILL}
          stroke={INK}
          strokeWidth="0.75"
          d="M48 140 A72 72 0 0 1 192 140"
        />
        <path
          stroke={INK_DIM}
          strokeWidth="0.55"
          d="M60 136 A58 58 0 0 1 180 136"
        />
      </g>

      {/* Tick marks */}
      {[
        { x1: 56, y1: 128, x2: 64, y2: 122 },
        { x1: 78, y1: 88, x2: 84, y2: 94 },
        { x1: 120, y1: 70, x2: 120, y2: 78 },
        { x1: 162, y1: 88, x2: 156, y2: 94 },
        { x1: 184, y1: 128, x2: 176, y2: 122 },
      ].map((t, i) => (
        <path
          key={i}
          stroke={i === 2 || i === 3 ? INK : INK_DIM}
          strokeWidth="0.6"
          strokeLinecap="round"
          d={`M${t.x1} ${t.y1} L${t.x2} ${t.y2}`}
        />
      ))}

      {/* Needle — points toward build zone */}
      <path
        stroke={INK}
        strokeWidth="1.1"
        strokeLinecap="round"
        d="M120 140 L158 96"
      />
      <circle cx="120" cy="140" r="4.5" fill={FILL} stroke={INK} strokeWidth="0.7" />
      <circle cx="120" cy="140" r="1.6" fill={INK_MID} />

      {/* Labels under arc */}
      <path stroke={INK_DIM} strokeWidth="0.45" strokeLinecap="round" d="M62 148 H78" />
      <path stroke={INK_DIM} strokeWidth="0.45" strokeLinecap="round" d="M162 148 H178" />

      <defs>
        <SoftShadow id="vfig-gauge-shadow" />
      </defs>
    </svg>
  )
}
