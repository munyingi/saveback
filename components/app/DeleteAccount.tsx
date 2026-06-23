"use client";

import { useState, useTransition } from "react";
import { X, TriangleAlert } from "lucide-react";
import { deleteMyAccount } from "@/app/actions";

// Self-serve account deletion. Deliberately low-emphasis: the trigger sits at
// the very bottom of the You screen, small and faint, so it is reachable for
// anyone who wants it but never draws the eye. The destructive step is gated
// behind a typed confirmation, and the server re-checks that word as well.
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const ready = confirm.trim().toUpperCase() === "DELETE";

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setError("");
  }

  function remove() {
    if (!ready) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteMyAccount("DELETE");
        // Account and session are both gone now; hard-navigate to the
        // signed-out landing page so nothing stale remains in memory.
        window.location.href = "/";
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Couldn't delete your account. Please try again.",
        );
      }
    });
  }

  return (
    <>
      <div className="danger-zone">
        <button
          type="button"
          className="danger-link"
          onClick={() => setOpen(true)}
        >
          Delete account
        </button>
      </div>

      {open && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button
              className="iconbtn"
              style={{ position: "static", marginLeft: "auto" }}
              onClick={close}
              aria-label="Close"
            >
              <X />
            </button>

            <div className="danger-ic">
              <TriangleAlert />
            </div>
            <h3 className="sheet-h">Delete your account</h3>
            <p className="sheet-sub">
              This permanently removes your profile, your number, your matches,
              and every request connected to your account. It cannot be undone.
              Type DELETE to confirm.
            </p>

            <div className="inp" style={{ marginBottom: 12 }}>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type DELETE"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Type DELETE to confirm"
              />
            </div>

            {error && <p className="errmsg">{error}</p>}

            <button
              className="signout btn-danger"
              style={{ marginTop: 0 }}
              onClick={remove}
              disabled={!ready || pending}
            >
              {pending ? "Deleting…" : "Permanently delete account"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
