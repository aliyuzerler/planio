import Link from "next/link";
import { SearchX } from "lucide-react";

export default function ProtectedNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef6f8] text-[#3d7a8c]">
        <SearchX className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-[#2f5563]">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#5a7380]">
          Aradığınız kayıt silinmiş ya da adres yanlış olabilir.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-xl bg-[#3d7a8c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
      >
        Göstergeye dön
      </Link>
    </div>
  );
}
