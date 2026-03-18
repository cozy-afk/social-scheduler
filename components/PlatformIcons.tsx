// ─── Platform Brand Icons (SVG) ─────────────────────────────────────────────

export interface PlatformIconProps {
  size?: number;
  className?: string;
}

export function InstagramIcon({ size = 16, className = '' }: PlatformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="25%" stopColor="#DD2A7B" />
          <stop offset="50%" stopColor="#8134AF" />
          <stop offset="75%" stopColor="#515BD4" />
          <stop offset="100%" stopColor="#405DE6" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#instagram-gradient)" />
      <path
        d="M12 7.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5zm6.5 2.5c0-1.6-1.4-3-3-3s-3 1.4-3 3 1.4 3 3 3 3-1.4 3-3zm-6.5 7.5c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"
        fill="white"
      />
      <circle cx="18" cy="6" r="1.5" fill="white" />
    </svg>
  );
}

export function TikTokIcon({ size = 16, className = '' }: PlatformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5" fill="#000000" />
      <path
        d="M12.5 2.5v13.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5v-6h-3v6c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-9h-3z"
        fill="#FF0050"
      />
      <path
        d="M12.5 2.5v9c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-9h-9z"
        fill="#00F2EA"
      />
      <circle cx="17" cy="7" r="2" fill="#FF0050" />
    </svg>
  );
}

export function XIcon({ size = 16, className = '' }: PlatformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5" fill="#000000" />
      <path
        d="M7 4l4 6h2l-4 6h5l4-6h-2l-4-6H7z"
        fill="white"
      />
      <path
        d="M12 10l2-3h-4l2 3z"
        fill="white"
      />
    </svg>
  );
}

export function ThreadsIcon({ size = 16, className = '' }: PlatformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5" fill="#000000" />
      <path
        d="M16.2 10.9c-.1-.1-.3-.1-.4-.2-.1-1.7-1-2.7-2.6-2.8h-.1c-1 0-1.8.4-2.3 1.2l.8.6c.4-.5.9-.8 1.5-.8h.1c.9.1 1.5.6 1.6 1.5-.3-.1-.7-.1-1.1-.1-1.6 0-2.7.9-2.7 2.2 0 1.3 1 2.2 2.5 2.2 1.2 0 2.1-.5 2.6-1.5.4.5.6 1 .6 1.6 0 1.4-1.4 2.3-3.2 2.3-2.4 0-4-1.8-4-4.1s1.6-4.1 4-4.1c1.4 0 2.4.4 3.1 1.2l.7-.6C16.3 8.5 15 8 13.2 8 10.3 8 8 10.4 8 13s2.3 5 5.2 5c2.2 0 3.8-1.2 3.8-3.1 0-.7-.2-1.4-.8-2z"
        fill="white"
      />
    </svg>
  );
}

export function FanvueIcon({ size = 16, className = '' }: PlatformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5" fill="#FF2E55" />
      <path
        d="M12 4c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"
        fill="white"
      />
      <circle cx="12" cy="9" r="1.5" fill="#FF2E55" />
      <circle cx="12" cy="15" r="1.5" fill="#FF2E55" />
    </svg>
  );
}

export const PLATFORM_ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  x: XIcon,
  threads: ThreadsIcon,
  fanvue: FanvueIcon,
} as const;
