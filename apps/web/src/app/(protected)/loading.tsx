export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        role="status"
        aria-label="Yükleniyor"
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#c5dde6] border-t-[#3d7a8c]"
      />
    </div>
  );
}
