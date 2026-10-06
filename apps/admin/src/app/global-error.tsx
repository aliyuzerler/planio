"use client";

/**
 * Kök layout'un kendisi çöktüğünde devreye giren son sınır. Root layout
 * devre dışı kaldığı için <html>/<body> burada yer almak zorundadır.
 */
export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#F7FBFC",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, color: "#2f5563", margin: 0 }}>
          Yönetim paneli yüklenemedi
        </h1>
        <p style={{ fontSize: 14, color: "#5a7380", maxWidth: 420 }}>
          Kritik bir hata oluştu. Lütfen sayfayı yeniden yükleyin; sorun
          sürerse sistem yöneticinize başvurun.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: 0,
            borderRadius: 12,
            background: "#3d7a8c",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
