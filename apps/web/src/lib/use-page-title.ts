import { useEffect } from "react";

/** Sekme başlığını sayfaya özel kılar; sayfadan çıkınca "Planio"ya döner. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Planio`;
    return () => {
      document.title = "Planio";
    };
  }, [title]);
}
