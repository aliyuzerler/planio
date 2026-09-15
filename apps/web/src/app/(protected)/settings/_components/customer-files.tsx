"use client";

import { useState, type FormEvent } from "react";
import type { CustomerFileKind } from "@xenior/types";
import { Button } from "@xenior/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import {
  deleteCustomerFile,
  downloadCustomerFile,
  uploadCustomerFile,
} from "@/lib/customers/customer-api";
import { useCustomerFiles } from "@/lib/customers/customer-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

const FILE_KIND_LABELS: Record<CustomerFileKind, string> = {
  KVKK: "KVKK belgesi",
  SIGNED_FORM: "Islak imza formu",
  OTHER: "Diğer",
};

export function CustomerFiles({
  customerId,
  canManage,
}: {
  customerId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  const files = useCustomerFiles(customerId);
  const { pushToast } = useToast();
  const [kind, setKind] = useState<CustomerFileKind>("KVKK");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["customers", businessId, customerId, "files"],
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      pushToast("Yüklenecek bir dosya seçin.", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadCustomerFile(customerId, kind, file);
      setFile(null);
      (event.target as HTMLFormElement).reset();
      setKind("KVKK");
      await refresh();
      pushToast("Belge yüklendi.");
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "Belge yüklenemedi.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string, originalName: string) {
    try {
      await downloadCustomerFile(customerId, fileId, originalName);
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "Belge indirilemedi.",
        "error",
      );
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCustomerFile(customerId, deleteId);
      await refresh();
      pushToast("Belge silindi.");
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "Belge silinemedi.",
        "error",
      );
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 p-6">
      <h2 className="text-lg font-semibold">Dijital arşiv</h2>
      <p className="mt-1 text-sm text-zinc-600">
        KVKK ve imzalı formlar müşteri kartında saklanır. Dosyalar genel
        erişime açılmaz.
      </p>

      {canManage ? (
        <form
          onSubmit={handleUpload}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="flex flex-col gap-1 text-sm">
            Belge türü
            <select
              aria-label="Belge türü"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as CustomerFileKind)
              }
              className="rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="KVKK">{FILE_KIND_LABELS.KVKK}</option>
              <option value="SIGNED_FORM">{FILE_KIND_LABELS.SIGNED_FORM}</option>
              <option value="OTHER">{FILE_KIND_LABELS.OTHER}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Dosya
            <input
              aria-label="Dosya"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={uploading || !file}>
            {uploading ? "Yükleniyor…" : "Yükle"}
          </Button>
        </form>
      ) : null}

      {files.isLoading ? (
        <p className="mt-4 text-sm text-zinc-600">Arşiv yükleniyor…</p>
      ) : null}
      {files.isError ? (
        <p className="mt-4 text-sm text-red-700">Belgeler yüklenemedi.</p>
      ) : null}
      {files.data?.length ? (
        <ul className="mt-4 grid gap-3">
          {files.data.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.originalName}</p>
                <p className="text-zinc-600">
                  {FILE_KIND_LABELS[item.kind]} ·{" "}
                  {new Date(item.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownload(item.id, item.originalName)}
                >
                  İndir
                </Button>
                {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteId(item.id)}
                  >
                    Sil
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : files.isSuccess ? (
        <p className="mt-4 text-sm text-zinc-600">
          Bu müşteri için henüz belge yok.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Belgeyi sil"
        description="Belge müşteri kartından ve depolamadan kaldırılır."
        confirmLabel="Sil"
        pending={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
