interface BrandLogoProps {
  size?: number;
  /** Title used for assistive tech. */
  title?: string;
}

/**
 * Brand mark for the portal — three stacked isometric cubes, evoking
 * extensions layered on top of the core directory.
 */
export function BrandLogo({ size = 28, title = 'Entra Extensions Manager' }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="32" height="32" rx="6" fill="#0078d4" />
      <g stroke="#0078d4" strokeWidth="0.6" strokeLinejoin="round">
        <polygon points="6,22 16,27 26,22 16,17" fill="#fff" opacity="0.55" />
        <polygon points="6,22 16,27 16,29.5 6,24.5" fill="#fff" opacity="0.35" />
        <polygon points="26,22 16,27 16,29.5 26,24.5" fill="#fff" opacity="0.45" />
        <polygon points="8,15 16,19 24,15 16,11" fill="#fff" opacity="0.8" />
        <polygon points="10,8 16,11 22,8 16,5" fill="#fff" />
      </g>
    </svg>
  );
}
