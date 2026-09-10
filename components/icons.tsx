import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => base(<><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" /></>, p);
export const IconWaveform = (p: IconProps) => base(<><path d="M3 12v.5M6.5 8v8M10 5v14M13.5 9v6M17 6v12M20.5 10.5v3" /></>, p);
export const IconMic = (p: IconProps) => base(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3M9 21h6" /></>, p);
export const IconSparkle = (p: IconProps) => base(<><path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9 12 3.5Z" /><path d="M19 15.5 19.6 17.5 21.5 18 19.6 18.5 19 20.5 18.4 18.5 16.5 18 18.4 17.5 19 15.5Z" /></>, p);
export const IconSearch = (p: IconProps) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" /></>, p);
export const IconLibrary = (p: IconProps) => base(<><path d="M4 4.5h4.5v15H4z" /><path d="M10.5 4.5H15v15h-4.5z" /><path d="m17.2 5.6 3.8 14.5-4.3 1.1L13 6.7" /></>, p);
export const IconVoices = (p: IconProps) => base(<><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c.6-3 2.7-4.7 5.5-4.7s4.9 1.7 5.5 4.7" /><path d="M16 7.2a3.2 3.2 0 0 1 0 6.2" /><path d="M15 14.4c2.4.3 4 1.9 4.5 4.6" /></>, p);
export const IconClock = (p: IconProps) => base(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, p);
export const IconMenu = (p: IconProps) => base(<><path d="M4 7h16M4 12h16M4 17h16" /></>, p);
export const IconClose = (p: IconProps) => base(<><path d="M6 6l12 12M18 6 6 18" /></>, p);
export const IconChevronRight = (p: IconProps) => base(<path d="m9 6 6 6-6 6" />, p);
export const IconUpload = (p: IconProps) => base(<><path d="M12 15V4M8 8l4-4 4 4" /><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" /></>, p);
export const IconPlay = (p: IconProps) => base(<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />, p);
export const IconDownload = (p: IconProps) => base(<><path d="M12 4v11M8 11l4 4 4-4" /><path d="M4.5 16v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V16" /></>, p);
export const IconTrash = (p: IconProps) => base(<><path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" /><path d="M7 7l.8 12a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" /><path d="M10.2 11v6M13.8 11v6" /></>, p);
export const IconCheck = (p: IconProps) => base(<path d="m5 12.5 4.5 4.5L19 7" />, p);
export const IconAlert = (p: IconProps) => base(<><path d="M12 3.5 21 19.5H3L12 3.5Z" /><path d="M12 10v4.2M12 17.3h.01" /></>, p);
export const IconPause = (p: IconProps) => base(<><rect x="7" y="5.5" width="3.4" height="13" rx="1" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1" /></>, p);
export const IconLogout = (p: IconProps) => base(<><path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" /><path d="M15.5 16.5 20 12l-4.5-4.5" /><path d="M20 12H9" /></>, p);
export const IconTag = (p: IconProps) => base(<><path d="M11.5 3.5H5a1.5 1.5 0 0 0-1.5 1.5v6.5a1.5 1.5 0 0 0 .44 1.06l8.5 8.5a1.5 1.5 0 0 0 2.12 0l6.5-6.5a1.5 1.5 0 0 0 0-2.12l-8.5-8.5a1.5 1.5 0 0 0-1.06-.44Z" /><circle cx="8.2" cy="8.2" r="1.2" fill="currentColor" stroke="none" /></>, p);
export const IconWand = (p: IconProps) => base(<><path d="m4 20 9.5-9.5" /><path d="M15.5 4.5 17 6M18.5 8 20 9.5M13 4l1 2.3L16.3 7.3 14 8.3 13 10.6 12 8.3 9.7 7.3 12 6.3 13 4Z" /></>, p);
export const IconFolder = (p: IconProps) => base(<><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.5h7A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" /></>, p);
export const IconArrowRight = (p: IconProps) => base(<><path d="M4 12h15.5" /><path d="m14 6 6 6-6 6" /></>, p);
export const IconChevronDown = (p: IconProps) => base(<path d="m6 9 6 6 6-6" />, p);
