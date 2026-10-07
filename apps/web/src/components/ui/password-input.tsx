"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Göster/gizle düğmeli parola alanı; className ile genişlik/dolgu verilir. */
export function PasswordInput({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Parolayı gizle" : "Parolayı göster"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-[#7eb8c8] transition hover:text-[#3d6b7a]"
      >
        {visible ? (
          <EyeOff className="h-[18px] w-[18px]" aria-hidden />
        ) : (
          <Eye className="h-[18px] w-[18px]" aria-hidden />
        )}
      </button>
    </div>
  );
}
