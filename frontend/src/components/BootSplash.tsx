import { useEffect } from "react";

type BootSplashProps = {
  onComplete: () => void;
};

export function BootSplash({ onComplete }: BootSplashProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete();
    }, 1450);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="boot-splash">
      <div className="boot-grid" />

      <div className="boot-glow" />

      <div className="boot-logo-wrap">
        <img
          src="/logo-m.png"
          alt="M/ERP"
          className="boot-logo"
        />
      </div>

      <div className="boot-brand">
        <strong>M/ERP</strong>
        <span>OPERATIONS OS</span>
      </div>
    </div>
  );
}