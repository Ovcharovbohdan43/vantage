/** Transparent GitHub-style blankslate figures — line art only, no panel background. */

const figClass = 'mx-auto h-auto w-full max-w-[160px] select-none opacity-90 sm:max-w-[180px]'

const stroke = 'currentColor'
const accent = '#E8FF47'

export type StateFigureKind = 'offline' | 'empty' | 'filter' | 'error' | 'report'

export function StateFigure({ kind }: { kind: StateFigureKind }) {
  switch (kind) {
    case 'offline':
      return <FigureOffline />
    case 'empty':
      return <FigureEmpty />
    case 'filter':
      return <FigureFilter />
    case 'report':
      return <FigureReport />
    case 'error':
    default:
      return <FigureError />
  }
}

/** Broken signal / unreachable service. */
function FigureOffline() {
  return (
    <svg
      className={`${figClass} text-v-muted`}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M16 92h168" stroke={stroke} strokeWidth="1.5" opacity="0.45" />
      <path
        d="M28 92c16-26 32-40 48-40s32 14 48 40"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M124 92c10-16 20-24 30-24 7 0 14 3.5 22 12"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3.5 5"
        opacity="0.55"
      />
      <circle cx="100" cy="52" r="16" stroke={accent} strokeWidth="1.5" />
      <path
        d="M92 52h6M102 52h6M100 44v6M100 54v6"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M88 66l-7 7M112 66l7 7"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}

/** Empty workspace — open document with plus. */
function FigureEmpty() {
  return (
    <svg
      className={`${figClass} text-v-muted`}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="36" y="22" width="128" height="96" rx="2.5" stroke={stroke} strokeWidth="1.5" />
      <path d="M36 44h128" stroke={stroke} strokeWidth="1.5" />
      <circle cx="48" cy="33" r="2.5" fill={stroke} opacity="0.55" />
      <circle cx="58" cy="33" r="2.5" fill={stroke} opacity="0.55" />
      <circle cx="68" cy="33" r="2.5" fill={stroke} opacity="0.55" />
      <path d="M56 70h88" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path d="M56 84h64" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path d="M56 98h48" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <circle cx="148" cy="96" r="18" fill="var(--color-v-bg, #0B0C10)" stroke={accent} strokeWidth="1.5" />
      <path
        d="M148 88v16M140 96h16"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** No filter matches — funnel. */
function FigureFilter() {
  return (
    <svg
      className={`${figClass} text-v-muted`}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M48 28h104L116 72v34l-16 12V72L48 28z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M66 42h68" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <circle cx="100" cy="108" r="9" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <path
        d="M100 103v10M95 108h10"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}

/** Soft generic error — alert mark. */
function FigureError() {
  return (
    <svg
      className={`${figClass} text-v-muted`}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="rotate(-5 100 70)">
        <rect x="52" y="28" width="96" height="84" rx="2.5" stroke={stroke} strokeWidth="1.5" />
        <path d="M52 48h96" stroke={stroke} strokeWidth="1.5" opacity="0.55" />
        <circle cx="100" cy="82" r="14" stroke={accent} strokeWidth="1.5" />
        <path
          d="M100 74v10M100 90v2.5"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

/** Report unavailable — document. */
function FigureReport() {
  return (
    <svg
      className={`${figClass} text-v-muted`}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M60 20h52l36 36v64a2.5 2.5 0 0 1-2.5 2.5H60A2.5 2.5 0 0 1 57.5 120V22.5A2.5 2.5 0 0 1 60 20z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M112 20v36h36" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M74 72h48" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path d="M74 86h36" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path d="M74 100h24" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <circle cx="148" cy="100" r="16" fill="var(--color-v-bg, #0B0C10)" stroke={accent} strokeWidth="1.5" />
      <path
        d="M148 92v10M148 108v2.5"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
