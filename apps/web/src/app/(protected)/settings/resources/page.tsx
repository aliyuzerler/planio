"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createResourceInputSchema } from "@xenior/validation";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { createResource, updateResource } from "@/lib/resources/resource-api";
import {
  useCanManageResources,
  useResourceList,
} from "@/lib/resources/resource-queries";

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
    <PageFrame width="lg">
      <PageHeader
        title="Kaynaklar"
        description="Oda, koltuk veya masa gibi isteğe bağlı kaynaklar. Aynı kaynakta çakışan randevular reddedilir."
      />
      {canManage ? (
        <form onSubmit={handleCreate} className="mt-6 flex flex-wrap gap-3">
          <input
            aria-label="Kaynak adı"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Örn. Koltuk 1"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2"
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Ekleniyor…" : "Kaynak ekle"}
          </Button>
        </form>
      ) : (
        <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          STAFF rolü kaynakları görüntüleyebilir ancak değiştiremez.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <QueryState
        isLoading={resources.isLoading}
        isError={resources.isError}
        isEmpty={resources.data?.length === 0}
        loading="Kaynaklar yükleniyor…"
        error="Kaynaklar yüklenemedi."
        empty="Henüz kaynak eklenmemiş. Randevuya kaynak bağlamak zorunlu değildir."
      >
        {resources.data ? (
          <DataTable caption="Kaynak listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Kaynak</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
                {canManage ? <DataTableHeaderCell>İşlem</DataTableHeaderCell> : null}
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {resources.data.map((resource) => (
                <DataTableRow key={resource.id}>
                  <DataTableCell>{resource.name}</DataTableCell>
                  <DataTableCell>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                      {resource.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </DataTableCell>
                  {canManage ? (
                    <DataTableCell>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          void toggleActive(resource.id, resource.isActive)
                        }
                      >
                        {resource.isActive ? "Pasifleştir" : "Aktifleştir"}
                      </Button>
                    </DataTableCell>
                  ) : null}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
