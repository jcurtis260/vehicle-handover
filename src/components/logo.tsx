export function Logo({
  className,
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 480 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="12 London Road"
    >
      {/* "12" — smaller serif text, baseline-aligned left */}
      <text
        x="0"
        y="62"
        fill={color}
        fontSize="36"
        fontFamily="'Georgia', 'Times New Roman', 'Times', serif"
        fontWeight="400"
        letterSpacing="2"
      >
        12
      </text>

      {/* "LONDON" — large uppercase serif, center */}
      <text
        x="80"
        y="62"
        fill={color}
        fontSize="54"
        fontFamily="'Georgia', 'Times New Roman', 'Times', serif"
        fontWeight="400"
        letterSpacing="12"
      >
        LONDON
      </text>

      {/* "RD" — smaller serif text, baseline-aligned right */}
      <text
        x="410"
        y="62"
        fill={color}
        fontSize="30"
        fontFamily="'Georgia', 'Times New Roman', 'Times', serif"
        fontWeight="400"
        letterSpacing="3"
      >
        RD
      </text>
    </svg>
  );
}
