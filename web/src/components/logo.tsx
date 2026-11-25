/** TRUCKS, the "2" in a green map pin, then a green U (Option A). */
export function Logo({ size = 23 }: { size?: number }) {
  return (
    <span role="img" aria-label="Trucks2U" className="inline-flex items-end font-extrabold leading-none text-[#111]" style={{ fontSize: size }}>
      <span aria-hidden="true">TRUCKS</span>
      <svg aria-hidden="true" viewBox="0 0 26 34" style={{ width: '0.98em', height: '1.28em', margin: '0 0.02em -0.2em 0.04em' }}>
        <path d="M13 0C5.8 0 0 5.6 0 12.6 0 21.5 13 34 13 34s13-12.5 13-21.4C26 5.6 20.2 0 13 0z" fill="#22a454" />
        <text x="13" y="17.6" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">2</text>
      </svg>
      <span aria-hidden="true" className="text-brand">U</span>
    </span>
  );
}
