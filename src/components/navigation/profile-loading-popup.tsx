export function ProfileLoadingPopup() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="status"
      aria-label="Loading Profile"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="tm-panel w-full max-w-sm text-center shadow-2xl">
        <p className="tm-display-eyebrow">Loading</p>
        <h2 className="tm-display-title mt-2 text-xl font-bold">
          Loading Profile...
        </h2>
        <p className="tm-body-copy mt-3 text-sm">
          Pulling your latest games, performance, and card analytics.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
          <span className="tm-profile-loading-dot tm-profile-loading-dot--one h-2 w-2 rounded-full bg-orange-300" />
          <span className="tm-profile-loading-dot tm-profile-loading-dot--two h-2 w-2 rounded-full bg-orange-300" />
          <span className="tm-profile-loading-dot tm-profile-loading-dot--three h-2 w-2 rounded-full bg-orange-300" />
        </div>
      </div>
      <style>{`
        @keyframes tm-profile-dot-one {
          0%, 100% { opacity: 1; }
        }

        @keyframes tm-profile-dot-two {
          0%, 32.99% { opacity: 0; }
          33%, 100% { opacity: 1; }
        }

        @keyframes tm-profile-dot-three {
          0%, 65.99% { opacity: 0; }
          66%, 100% { opacity: 1; }
        }

        .tm-profile-loading-dot {
          opacity: 0;
          animation-duration: 1.2s;
          animation-iteration-count: infinite;
          animation-timing-function: steps(1, end);
        }

        .tm-profile-loading-dot--one {
          animation-name: tm-profile-dot-one;
        }

        .tm-profile-loading-dot--two {
          animation-name: tm-profile-dot-two;
        }

        .tm-profile-loading-dot--three {
          animation-name: tm-profile-dot-three;
        }
      `}</style>
    </div>
  );
}
