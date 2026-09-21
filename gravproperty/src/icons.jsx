// Small hand-drawn icon set (feather-style, currentColor) so the app doesn't
// need an icon library dependency for half a dozen glyphs.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const IconBuilding = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01" />
    <path d="M10 21v-3.5a2 2 0 0 1 4 0V21" />
  </svg>
)

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
)

export const IconDownload = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
)

export const IconPaperclip = (p) => (
  <svg {...base} {...p}>
    <path d="M8 12.5l6.7-6.7a3.2 3.2 0 0 1 4.5 4.5l-8.2 8.2a5 5 0 1 1-7.1-7.1L11.5 3.8" />
  </svg>
)

export const IconClock = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
