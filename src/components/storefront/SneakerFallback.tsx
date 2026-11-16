import React from 'react';

export function SneakerFallback({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 p-6 text-center select-none">
      <svg
        viewBox="0 0 180 90"
        className="h-20 w-36 text-zinc-300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 64C16 58 20 44 26 36C31 29 38 34 48 34C61 34 72 22 86 22C98 22 110 38 128 44C144 49 162 50 166 58C169 64 164 70 154 70H26C19 70 16 67 16 64Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M18 63H164" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="mt-2 text-[11px] font-medium text-zinc-400 line-clamp-1">
        {name} · Foto oficial pendente
      </span>
    </div>
  );
}
