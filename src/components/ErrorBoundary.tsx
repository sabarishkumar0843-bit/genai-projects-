import React, { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const ErrorBoundary = ({ children }: Props) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-8 text-center bg-bg min-h-screen flex flex-col items-center justify-center font-sans">
        <div className="bg-surface border border-border p-10 max-w-md w-full">
          <h2 className="text-4xl font-display uppercase tracking-tighter text-red-500 mb-4">System Error</h2>
          <p className="text-text-dim uppercase tracking-widest text-[10px] font-bold mb-8">
            {error?.message || "An unexpected error occurred."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-accent text-black font-display uppercase text-lg hover:bg-white transition-all"
          >
            Reboot System
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
