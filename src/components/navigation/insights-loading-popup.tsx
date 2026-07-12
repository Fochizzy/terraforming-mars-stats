export function InsightsLoadingPopup() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="status"
      aria-label="Loading Insights"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="tm-panel w-full max-w-sm text-center shadow-2xl">
        <p className="tm-display-eyebrow">Loading</p>
        <h2 className="tm-display-title mt-2 text-xl font-bold">
          Loading Insights...
        </h2>
        <p className="tm-body-copy mt-3 text-sm">
          Pulling the latest group, player, and card analytics.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
          <span className="tm-insights-loading-dot tm-insights-loading-dot--one h-2 w-2 rounded-full bg-orange-300" />
          <span className="tm-insights-loading-dot tm-insights-loading-dot--two h-2 w-2 rounded-full bg-orange-300" />
          <span className="tm-insights-loading-dot tm-insights-loading-dot--three h-2 w-2 rounded-full bg-orange-300" />
        </div>
      </div>
      <style>{`
        @keyframes tm-insights-dot-one {
          0%, 32.99% { opacity: 1; }
          33%, 100% { opacity: 0; }
        }

        @keyframes tm-insights-dot-two {
          0%, 32.99% { opacity: 0; }
          33%, 65.99% { opacity: 1; }
          66%, 100% { opacity: 0; }
        }

        @keyframes tm-insights-dot-three {
          0%, 65.99% { opacity: 0; }
          66%, 100% { opacity: 1; }
        }

        .tm-insights-loading-dot {
          opacity: 0;
          animation-duration: 1.2s;
          animation-iteration-count: infinite;
          animation-timing-function: steps(1, end);
        }

        .tm-insights-loading-dot--one {
          animation-name: tm-insights-dot-one;
        }

        .tm-insights-loading-dot--two {
          animation-name: tm-insights-dot-two;
        }

        .tm-insights-loading-dot--three {
          animation-name: tm-insights-dot-three;
        }
      `}</style>
    </div>
  );
}
