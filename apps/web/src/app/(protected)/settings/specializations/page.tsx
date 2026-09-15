"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
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
    <PageFrame width="sm">
      <PageHeader
        title="Uzmanlıklar"
        description="Personellere atanabilecek uzmanlık kataloğunu yönetin."
      />

      {!canManage ? (
        <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          STAFF rolü uzmanlıkları yalnızca görüntüleyebilir.
        </p>
      ) : (
        <form onSubmit={add} className="mt-6 flex gap-2">
          <input
            aria-label="Uzmanlık adı"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2"
          />
          <Button type="submit" disabled={saving}>
            Ekle
          </Button>
        </form>
      )}

      <div className="mt-6 grid gap-3">
        {specializations.data?.map((specialization) => (
          <div
            key={specialization.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-4"
          >
            <div>
              <p className="font-medium">{specialization.name}</p>
              <p className="text-sm text-zinc-600">
                {specialization.isActive ? "Aktif" : "Pasif"}
              </p>
            </div>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() =>
                  toggle(specialization.id, specialization.isActive)
                }
              >
                {specialization.isActive ? "Kaldır" : "Aktifleştir"}
              </Button>
            ) : null}
          </div>
        ))}
        {specializations.isLoading ? (
          <p className="text-sm text-zinc-600">Uzmanlıklar yükleniyor…</p>
        ) : null}
        {specializations.data?.length === 0 ? (
          <p className="text-sm text-zinc-600">Henüz uzmanlık eklenmemiş.</p>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="mt-4 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </PageFrame>
  );
}
