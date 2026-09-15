import type { ReactNode } from "react";

export function QueryState({
  isLoading,
  isError,
  isEmpty,
  loading,
  error,
  empty,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  loading: ReactNode;
  error: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <p role="status" className="mt-8 text-sm text-zinc-600">
        {loading}
      </p>
    );
  }
  if (isError) {
    return (
      <p role="alert" className="mt-8 text-sm text-red-700">
        {error}
      </p>
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
