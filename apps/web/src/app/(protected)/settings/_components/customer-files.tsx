"use client";

import { useState, type FormEvent } from "react";
import type { CustomerFileKind } from "@xenior/types";
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

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

const FILE_KIND_LABELS: Record<CustomerFileKind, string> = {
  KVKK: "KVKK belgesi",
  SIGNED_FORM: "Islak imza formu",
  OTHER: "Diğer",
};

const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

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
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Dijital arşiv
        </h2>
        <p className="mt-0.5 text-[13px] text-[#5a7380]">
          KVKK ve imzalı formlar müşteri kartında saklanır. Dosyalar genel
          erişime açılmaz.
        </p>
      </div>

      <div className="p-5">
        {canManage ? (
          <form
            onSubmit={handleUpload}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Belge türü
              <select
                aria-label="Belge türü"
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as CustomerFileKind)
                }
                className={fieldClass}
              >
                <option value="KVKK">{FILE_KIND_LABELS.KVKK}</option>
                <option value="SIGNED_FORM">{FILE_KIND_LABELS.SIGNED_FORM}</option>
                <option value="OTHER">{FILE_KIND_LABELS.OTHER}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Dosya
              <input
                aria-label="Dosya"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={fieldClass}
              />
            </label>
            <button
              type="submit"
              disabled={uploading || !file}
              className="rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6aa9bb] disabled:opacity-60"
            >
              {uploading ? "Yükleniyor…" : "Yükle"}
            </button>
          </form>
        ) : null}

        {files.isLoading ? (
          <p className="mt-4 text-sm text-[#5a7380]">Arşiv yükleniyor…</p>
        ) : null}
        {files.isError ? (
          <p className="mt-4 text-sm text-red-700">Belgeler yüklenemedi.</p>
        ) : null}
        {files.data?.length ? (
          <ul className="mt-4 divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
            {files.data.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1e3340]">
                    {item.originalName}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#5a7380]">
                    {FILE_KIND_LABELS[item.kind]} ·{" "}
                    {new Date(item.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload(item.id, item.originalName)}
                    className="rounded-xl bg-white px-3 py-1.5 text-[13px] font-semibold text-[#3d6b7a] ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
                  >
                    İndir
                  </button>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setDeleteId(item.id)}
                      className="rounded-xl bg-white px-3 py-1.5 text-[13px] font-semibold text-[#5a7380] ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
                    >
                      Sil
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : files.isSuccess ? (
          <p className="mt-4 text-sm text-[#5a7380]">
            Bu müşteri için henüz belge yok.
          </p>
        ) : null}
      </div>

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
