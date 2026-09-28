"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createResourceInputSchema } from "@xenior/validation";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { createResource, updateResource } from "@/lib/resources/resource-api";
import {
  useCanManageResources,
  useResourceList,
} from "@/lib/resources/resource-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function ResourcesPage() {
  const queryClient = useQueryClient();
  const canManage = useCanManageResources();
  const resources = useResourceList();
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["resources"] });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = createResourceInputSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin.");
      return;
    }
    setSaving(true);
    try {
      await createResource(parsed.data);
      setName("");
      await refresh();
      pushToast("Kaynak eklendi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Kaynak eklenemedi.";
      setError(text);
      pushToast(text, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updateResource(id, { isActive: !isActive });
      await refresh();
      pushToast("Kaynak güncellendi.");
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "Kaynak güncellenemedi.",
        "error",
      );
    }
  }

  return (
    <PageFrame width="lg" className="relative">
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
          Kaynaklar
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Oda, koltuk veya masa gibi isteğe bağlı kaynaklar. Aynı kaynakta
          çakışan randevular reddedilir.
        </p>
      </div>

      {canManage ? (
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2
              className="text-lg font-semibold text-[#2f5563]"
              style={displayFont}
            >
              Kaynak ekle
            </h2>
            <p className="mt-0.5 text-[13px] text-[#5a7380]">
              Yeni kaynak adı tanımlayın
            </p>
          </div>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 p-5">
            <input
              aria-label="Kaynak adı"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Örn. Koltuk 1"
              className={`min-w-0 flex-1 ${fieldClass}`}
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6aa9bb] disabled:opacity-60"
            >
              {saving ? "Ekleniyor…" : "Kaynak ekle"}
            </button>
          </form>
          {error ? (
            <p role="alert" className="px-5 pb-4 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-6 rounded-xl bg-[#eef6f8] px-4 py-3 text-sm leading-6 text-[#3d6b7a] ring-1 ring-[#c5dde6]/70">
          Personel rolü kaynakları görüntüleyebilir ancak değiştiremez.
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Kaynak listesi
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={resources.isLoading}
            isError={resources.isError}
            isEmpty={resources.data?.length === 0}
            loading="Kaynaklar yükleniyor…"
            error="Kaynaklar yüklenemedi."
            empty="Henüz kaynak eklenmemiş. Randevuya kaynak bağlamak zorunlu değildir."
          >
            {resources.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {resources.data.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-[#1e3340]">
                        {resource.name}
                      </p>
                      <div className="mt-1">
                        <StatusBadge active={resource.isActive} />
                      </div>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() =>
                          void toggleActive(resource.id, resource.isActive)
                        }
                        className="rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold text-[#3d6b7a] ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
                      >
                        {resource.isActive ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </QueryState>
        </div>
      </section>
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
