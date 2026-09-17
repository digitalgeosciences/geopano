interface LogoProps {
  dark?: boolean;
  size?: number;
}

export default function Logo({ dark = false, size = 30 }: LogoProps) {
  const stroke = dark ? "#F4F2ED" : "#0B0F0E";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke={stroke} strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="5.5" ry="13" stroke={stroke} strokeWidth="2" />
      <path d="M3.4 12.5h25.2M3.4 19.5h25.2" stroke={stroke} strokeWidth="2" />
      <circle cx="24.4" cy="7.6" r="4.6" fill="#C9F24D" stroke="#0B0F0E" strokeWidth="2" />
    </svg>
  );
}
