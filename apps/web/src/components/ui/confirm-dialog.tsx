"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

function AcknowledgeField({
  label,
  pending,
  onChange,
}: {
  label: string;
  pending: boolean;
  onChange: (checked: boolean) => void;
}) {
  const acknowledgeId = useId();
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <label
      htmlFor={acknowledgeId}
      className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#F7FBFC] px-3 py-3 text-[13px] leading-5 text-[#1e3340] ring-1 ring-[#e4f0f4]"
    >
      <input
        id={acknowledgeId}
        type="checkbox"
        checked={acknowledged}
        disabled={pending}
        onChange={(event) => {
          setAcknowledged(event.target.checked);
          onChange(event.target.checked);
        }}
        className="mt-0.5 accent-[#7eb8c8]"
      />
      <span>{label}</span>
    </label>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  pending = false,
  acknowledgeLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  /** When set, confirm stays disabled until the user checks this box. */
  acknowledgeLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [ackState, setAckState] = useState({ open, acknowledged: false });

  if (ackState.open !== open) {
    setAckState({ open, acknowledged: false });
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const canConfirm =
    !pending && (!acknowledgeLabel || ackState.acknowledged);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-50 m-auto h-fit w-[min(calc(100vw-2rem),28rem)] max-h-[min(90vh,36rem)] overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-xl ring-1 ring-[#c5dde6]/80 open:flex open:flex-col backdrop:bg-[#1e3340]/45 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) onCancel();
      }}
    >
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/70 px-5 py-4">
        <h2
          id={titleId}
          className="text-lg font-semibold tracking-tight text-[#2f5563]"
          style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
        >
          {title}
        </h2>
      </div>

      <div className="px-5 py-4">
        <div id={descriptionId} className="text-[14px] leading-6 text-[#5a7380]">
          {description}
        </div>
        {open && acknowledgeLabel ? (
          <AcknowledgeField
            key={acknowledgeLabel}
            label={acknowledgeLabel}
            pending={pending}
            onChange={(checked) =>
              setAckState((current) => ({ ...current, acknowledged: checked }))
            }
          />
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4f0f4] px-5 py-4">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={onConfirm}
          className="inline-flex items-center justify-center rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60"
        >
          {pending ? "İşleniyor…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
