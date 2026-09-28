"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import {
  createSpecialization,
  updateSpecialization,
} from "@/lib/staff/staff-api";
import {
  useCanManageStaff,
  useSpecializations,
} from "@/lib/staff/staff-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function SpecializationsPage() {
  const queryClient = useQueryClient();
  const specializations = useSpecializations();
  const canManage = useCanManageStaff();
  const [name, setName] = useState("");
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await createSpecialization({ name });
      setName("");
    });
  }

  async function toggle(id: string, isActive: boolean) {
    await run(async () => {
      await updateSpecialization(id, { isActive: !isActive });
    });
  }

  async function run(operation: () => Promise<void>) {
    setMessage(null);
    setSaving(true);
    try {
      await operation();
      await queryClient.invalidateQueries({ queryKey: ["specializations"] });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      setMessage("Değişiklik kaydedildi.");
      pushToast("Değişiklik kaydedildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "İşlem tamamlanamadı.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Katalog
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Uzmanlıklar
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Personellere atanabilecek uzmanlık kataloğunu yönetin.
        </p>
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-xl bg-[#eef6f8] px-4 py-3 text-sm leading-6 text-[#3d6b7a] ring-1 ring-[#c5dde6]/70">
          Personel rolü uzmanlıkları yalnızca görüntüleyebilir.
        </p>
      ) : (
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2
              className="text-lg font-semibold text-[#2f5563]"
              style={displayFont}
            >
              Uzmanlık ekle
            </h2>
            <p className="mt-0.5 text-[13px] text-[#5a7380]">
              Yeni uzmanlık adını tanımlayın
            </p>
          </div>
          <form onSubmit={add} className="flex flex-wrap gap-3 p-5">
            <input
              aria-label="Uzmanlık adı"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn. Lazer epilasyon"
              className={`min-w-0 flex-1 ${fieldClass}`}
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6aa9bb] disabled:opacity-60"
            >
              {saving ? "Ekleniyor…" : "Ekle"}
            </button>
          </form>
        </section>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Uzmanlık listesi
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          {specializations.isLoading ? (
            <p className="text-sm text-[#5a7380]">Uzmanlıklar yükleniyor…</p>
          ) : null}
          {specializations.data?.length ? (
            <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
              {specializations.data.map((specialization) => (
                <li
                  key={specialization.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-[#1e3340]">
                      {specialization.name}
                    </p>
                    <div className="mt-1">
                      <StatusBadge active={specialization.isActive} />
                    </div>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void toggle(specialization.id, specialization.isActive)
                      }
                      className="rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold text-[#3d6b7a] ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8] disabled:opacity-60"
                    >
                      {specialization.isActive ? "Kaldır" : "Aktifleştir"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : specializations.isSuccess ? (
            <p className="text-sm text-[#5a7380]">Henüz uzmanlık eklenmemiş.</p>
          ) : null}
        </div>
      </section>

      {message ? (
        <p role="status" className="mt-4 text-sm font-medium text-[#3d6b7a]">
          {message}
        </p>
      ) : null}
    </PageFrame>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-[#b8e6df]/45 text-[#2f5563]"
          : "bg-[#e4f0f4] text-[#5a7380]"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}
