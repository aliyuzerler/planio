import type { ReactNode } from "react";

export function QueryState({
  isLoading,
  isError,
  isEmpty,
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  loading: ReactNode;
  error: ReactNode;
  empty?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div role="status" className="mt-8">
        <span className="sr-only">{loading}</span>
        <div aria-hidden className="grid gap-3">
          <div className="h-5 w-2/5 animate-pulse rounded-lg bg-[#e4f0f4]" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-[#e4f0f4]" />
          <div className="h-4 w-5/6 animate-pulse rounded-lg bg-[#e4f0f4]" />
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-[#e4f0f4]" />
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[#e4f0f4]" />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="mt-8 text-sm text-red-700">
        <p>{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-white px-3 py-1.5 text-[13px] font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8]"
          >
            Tekrar dene
          </button>
        ) : null}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <p role="status" className="mt-8 text-sm text-zinc-600">
        {empty}
      </p>
    );
  }
  return children;
}
