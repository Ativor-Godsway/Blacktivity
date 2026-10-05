"use client";

import { useImperativeHandle, useRef, useState, type ComponentProps, type Ref } from "react";

export type PasswordInputHandle = {
  /** Back to dots — called after a successful submit. */
  hide: () => void;
  focus: () => void;
};

/**
 * Every password field in the admin — Revision 25 §2.
 *
 * The eye is a real <button type="button"> inside the field's right end. It
 * swaps `type` between password and text, and keeps focus and the caret where
 * they were so toggling mid-word doesn't throw the cursor to the end.
 */
export function PasswordInput({
  className,
  handle,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { handle?: Ref<PasswordInputHandle> }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(handle, () => ({
    hide: () => setVisible(false),
    focus: () => inputRef.current?.focus(),
  }));

  function toggle() {
    const input = inputRef.current;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible((v) => !v);
    // After React has swapped the type: back into the field, caret restored.
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      if (start !== null && end !== null) input.setSelectionRange(start, end);
    });
  }

  return (
    <div className="a-password">
      <input
        ref={inputRef}
        type={visible ? "text" : "password"}
        className={className ? `a-field ${className}` : "a-field"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
      <button
        type="button"
        className="a-password-toggle"
        onClick={toggle}
        // Keep focus in the field on pointer down; the click still toggles.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

function Eye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1" />
      <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default PasswordInput;
