"use client";

import { ActionButton } from "@/components/action-button";
import { toast } from "@/components/toast";

/**
 * A one-button server-action form with a pending spinner and a success toast.
 * Server components can pass their server action straight in as a prop.
 */
export function ActionForm({
  action,
  fields,
  success,
  buttonClassName,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  /** Toast message shown after the action completes. */
  success: string;
  buttonClassName: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={async (formData: FormData) => {
        await action(formData);
        toast(success);
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <ActionButton className={buttonClassName}>{children}</ActionButton>
    </form>
  );
}
