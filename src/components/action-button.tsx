"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/**
 * Submit button for server-action forms with a pending spinner. Must be
 * rendered inside the <form> whose status it reports.
 */
export function ActionButton({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (
        <LoaderCircle size={13} className="animate-spin" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
