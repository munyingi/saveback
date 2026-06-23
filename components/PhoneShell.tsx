// The phone-frame mockup from the prototype: a centered device on desktop,
// full-screen on mobile (handled by the .sb-root / .phone CSS media query).
export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sb-root">
      <div className="phone">{children}</div>
    </div>
  );
}
