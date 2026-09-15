import Link from "next/link";
import { PlanioLogo } from "@/components/brand/planio-logo";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <PlanioLogo className="h-12" />
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Admin
      </p>
      <p className="max-w-md text-center text-sm text-zinc-600">
        Platform yöneticileri işletmeleri, abonelikleri ve denetim kayıtlarını
        buradan görüntüler.
      </p>
      <Link href="/login" className="text-sm underline">
        Yönetici girişi
      </Link>
    </main>
  );
}
