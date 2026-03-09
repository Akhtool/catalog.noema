"use client";

import { useEffect } from "react";

import { trackClientEvent } from "@/lib/client-observability";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackClientEvent("client_error", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#F9FAFB] px-4 py-10 text-[#222]">
        <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
          <p className="mt-2 text-sm text-[#666]">
            Ошибка уже попала в базовый журнал. Попробуйте перезагрузить экран.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
