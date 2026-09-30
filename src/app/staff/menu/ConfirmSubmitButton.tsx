"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  message: string;
  className?: string;
  children: ReactNode;
};

/** Submit button that asks for confirmation before the form is sent. */
export default function ConfirmSubmitButton({ message, className, children }: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
