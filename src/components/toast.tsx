"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CircleCheck, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Tiny self-built toast store — no context needed, callable from any client
// component via toast("…"). The <Toaster /> is mounted once in the app shell.
// ---------------------------------------------------------------------------

type ToastItem = { id: number; message: string };

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ToastItem[] = [];
const getSnapshot = () => items;
const getServerSnapshot = () => EMPTY;

/** Show a success/confirmation toast. Safe to call from any client code. */
export function toast(message: string) {
  items = [...items, { id: nextId++, message }];
  emit();
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const AUTO_DISMISS_MS = 4500;

function Toast({ item }: { item: ToastItem }) {
  useEffect(() => {
    const t = setTimeout(() => dismissToast(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [item.id]);

  return (
    <div
      role="status"
      className="animate-rise pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3.5 shadow-lg shadow-zinc-900/5 sm:w-80"
    >
      <CircleCheck
        size={16}
        className="mt-0.5 shrink-0 text-indigo-600"
        aria-hidden
      />
      <p className="flex-1 text-sm leading-5 text-zinc-800">{item.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}

/** Fixed-position toast outlet. Mount once in the app layout. */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (list.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5">
      {list.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  );
}
