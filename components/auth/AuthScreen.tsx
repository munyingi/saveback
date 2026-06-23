"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Lock, ArrowLeft, BadgeCheck, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CountryPicker } from "@/components/CountryPicker";
import { DEFAULT_COUNTRY, dialOf, flagOf } from "@/lib/constants";

// Supabase SMS OTP is 6 digits by default.
const CODE_LEN = 6;
const stripLeadingZeros = (s: string) => s.replace(/[^\d]/g, "").replace(/^0+/, "");

function prettyE164(raw: string): string {
  const d = raw.replace(/[^\d]/g, "");
  return d ? "+" + d.replace(/(\d{3})(?=\d)/g, "$1 ") : "";
}

export function AuthScreen({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [localPhone, setLocalPhone] = useState("");
  const [picking, setPicking] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [phoneDone, setPhoneDone] = useState(false);
  const [needEmailStep, setNeedEmailStep] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [info, setInfo] = useState("");
  const [verifyPhone, setVerifyPhone] = useState(""); // E.164 for display + resume

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  function e164(): string {
    const local = stripLeadingZeros(localPhone);
    return local ? `+${dialOf(country)}${local}` : "";
  }

  // Resume an unfinished session straight at the email step.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const phoneOk = Boolean(user.phone_confirmed_at);
      const emailOk = Boolean(user.email_confirmed_at);
      if (phoneOk && emailOk) {
        router.replace("/onboarding");
        return;
      }
      if (phoneOk && !emailOk) {
        setMode("signup");
        setVerifyPhone(user.phone ? "+" + user.phone : "");
        setEmail(user.new_email ?? user.email ?? "");
        setStep("verify");
        setPhoneDone(true);
        setNeedEmailStep(true);
        setInfo("Confirm your email to continue.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetToForm() {
    setStep("form");
    setCode(Array(CODE_LEN).fill(""));
    setPhoneDone(false);
    setNeedEmailStep(false);
    setEmailVerified(false);
    setError("");
    setInfo("");
  }

  async function submitForm() {
    setError("");
    const phone = e164();
    if (!phone || phone.length < 8) {
      setError("Enter a valid number.");
      return;
    }
    if (mode === "signup" && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: mode === "signup" },
    });
    setBusy(false);
    if (error) {
      setError(
        mode === "signin" && /not found|no user|signups/i.test(error.message)
          ? "We couldn't find an account with that number. Try signing up instead."
          : error.message,
      );
      return;
    }
    setVerifyPhone(phone);
    setInfo(`Code sent to ${prettyE164(phone)}`);
    setStep("verify");
    setTimeout(() => codeRefs.current[0]?.focus(), 50);
  }

  async function verifyCode() {
    setError("");
    const token = code.join("");
    if (token.length < CODE_LEN) {
      setError(`Enter the full ${CODE_LEN}-digit code.`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164() || verifyPhone,
      token,
      type: "sms",
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    setPhoneDone(true);
    const user = data.user;
    const next = `/onboarding?country=${encodeURIComponent(country)}`;
    if (user?.email_confirmed_at) {
      router.replace(next);
      return;
    }
    if (email) {
      const { error: upErr } = await supabase.auth.updateUser({ email });
      if (upErr) {
        setBusy(false);
        setError(upErr.message);
        return;
      }
    }
    setBusy(false);
    setNeedEmailStep(true);
    setInfo(
      `Tap the link we emailed to ${email || user?.email}. This page updates on its own.`,
    );
  }

  useEffect(() => {
    if (!needEmailStep || emailVerified) return;
    const id = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) setEmailVerified(true);
    }, 3000);
    return () => clearInterval(id);
  }, [needEmailStep, emailVerified, supabase]);

  useEffect(() => {
    if (phoneDone && emailVerified) {
      router.replace(`/onboarding?country=${encodeURIComponent(country)}`);
    }
  }, [phoneDone, emailVerified, router, country]);

  async function resendEmail() {
    setError("");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) setError(error.message);
    else setInfo("Sent again. Check your inbox and spam folder.");
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/[^\d]/g, "").slice(-1);
    setCode((c) => {
      const n = [...c];
      n[i] = d;
      return n;
    });
    if (d && i < CODE_LEN - 1) codeRefs.current[i + 1]?.focus();
  }

  return (
    <div className="auth">
      <div className="brand">
        <b>
          Save<span>Back</span>
        </b>
        <small>save for save</small>
      </div>

      {step === "form" && (
        <>
          <h1>
            {mode === "signin" ? (
              <>
                Welcome
                <br />
                back.
              </>
            ) : (
              <>
                Join
                <br />
                <span>SaveBack.</span>
              </>
            )}
          </h1>
          <p className="tg">
            {mode === "signin"
              ? "Sign in with the number on your account. We'll send a verification code by text."
              : "Real accounts only, each with a verified phone and email. Your number stays private until you both save."}
          </p>

          <div className="authtabs">
            <button
              className={"authtab" + (mode === "signin" ? " on" : "")}
              onClick={() => {
                setMode("signin");
                resetToForm();
              }}
            >
              Sign in
            </button>
            <button
              className={"authtab" + (mode === "signup" ? " on" : "")}
              onClick={() => {
                setMode("signup");
                resetToForm();
              }}
            >
              Sign up
            </button>
          </div>

          {mode === "signup" && (
            <div className="fld">
              <label>Your country</label>
              <button
                type="button"
                className="chip-country"
                onClick={() => setPicking(true)}
              >
                <span className="fl">{flagOf(country)}</span> {country}{" "}
                <span className="chg">change</span>
              </button>
            </div>
          )}

          <div className="fld">
            <label>WhatsApp number</label>
            <div className="inp">
              <Phone />
              {mode === "signup" ? (
                <span className="dial">+{dialOf(country)}</span>
              ) : (
                <button
                  type="button"
                  className="dial"
                  onClick={() => setPicking(true)}
                  style={{
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                  }}
                >
                  {flagOf(country)} +{dialOf(country)}
                </button>
              )}
              <span className="divider" />
              <input
                value={localPhone}
                inputMode="tel"
                placeholder="712 000 000"
                onChange={(e) =>
                  setLocalPhone(e.target.value.replace(/[^\d]/g, ""))
                }
              />
            </div>
            <div className="lockmsg">
              <Lock />{" "}
              {mode === "signup"
                ? "Enter your local number. Your country sets the dialing code."
                : "Tap the code to change your country."}{" "}
              Your number stays private until you both save.
            </div>
          </div>

          {mode === "signup" && (
            <div className="fld">
              <label>Email</label>
              <div className="inp">
                <Mail />
                <input
                  value={email}
                  inputMode="email"
                  placeholder="you@email.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="lockmsg">
                <Lock /> Used only for your account and security. It is never
                shown to anyone.
              </div>
            </div>
          )}

          {error && <p className="errmsg">{error}</p>}

          <div className="go">
            <button className="btn btn-save" onClick={submitForm} disabled={busy}>
              {busy
                ? "Sending…"
                : mode === "signin"
                  ? "Continue"
                  : "Create account"}
            </button>
            <p className="note">
              Save for save with verified people. We never message anyone on
              your behalf. Every WhatsApp is sent from your own phone.
            </p>
          </div>
        </>
      )}

      {step === "verify" && (
        <>
          <button className="back" onClick={resetToForm}>
            <ArrowLeft /> Back
          </button>
          <h1 style={{ fontSize: 23 }}>
            Verify it&apos;s
            <br />
            <span>really you.</span>
          </h1>
          <p className="tg">
            A verified phone and email keep every account genuine and keep
            abusers out.
          </p>

          {!phoneDone ? (
            <>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                Code sent to {prettyE164(verifyPhone)}
              </label>
              <div className="codebox">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      codeRefs.current[i] = el;
                    }}
                    value={d}
                    maxLength={1}
                    inputMode="numeric"
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !code[i] && i > 0)
                        codeRefs.current[i - 1]?.focus();
                    }}
                  />
                ))}
              </div>
              <p className="note" style={{ marginTop: 0 }}>
                Enter the {CODE_LEN}-digit code we sent by text.
              </p>
            </>
          ) : (
            <div className="verifrow done">
              <div className="ic">
                <BadgeCheck />
              </div>
              <div className="t">
                <b>Phone verified</b>
                <small>{prettyE164(verifyPhone)}</small>
              </div>
              <Check style={{ width: 18, height: 18, color: "var(--save)" }} />
            </div>
          )}

          {needEmailStep && (
            <div className={"verifrow" + (emailVerified ? " done" : "")}>
              <div className="ic">
                {emailVerified ? <BadgeCheck /> : <Mail />}
              </div>
              <div className="t">
                <b>{emailVerified ? "Email verified" : "Verify your email"}</b>
                <small>
                  {emailVerified
                    ? email
                    : `Tap the link we sent to ${email}. This page updates once you do.`}
                </small>
              </div>
              {emailVerified ? (
                <Check style={{ width: 18, height: 18, color: "var(--save)" }} />
              ) : (
                <button className="linkbtn" onClick={resendEmail}>
                  Resend
                </button>
              )}
            </div>
          )}

          {error && <p className="errmsg">{error}</p>}
          {info && !error && (
            <p className="note" style={{ marginTop: 10 }}>
              {info}
            </p>
          )}

          <div className="go">
            {!needEmailStep ? (
              <button
                className="btn btn-save"
                onClick={verifyCode}
                disabled={busy || code.join("").length < CODE_LEN}
              >
                <BadgeCheck /> {busy ? "Verifying…" : "Verify code"}
              </button>
            ) : (
              <button
                className="btn btn-save"
                onClick={() =>
                  router.replace(
                    `/onboarding?country=${encodeURIComponent(country)}`,
                  )
                }
                disabled={!emailVerified}
              >
                <BadgeCheck /> {emailVerified ? "Continue" : "Waiting for email…"}
              </button>
            )}
          </div>
        </>
      )}

      {picking && (
        <div className="picker">
          <div className="picker-hd">
            <button className="back" onClick={() => setPicking(false)}>
              <ArrowLeft /> Back
            </button>
            <b>Your country</b>
          </div>
          <p className="picker-sub">
            This sets your dialing code. Your number stays hidden until you both
            save.
          </p>
          <CountryPicker
            selected={country}
            onPick={(c) => {
              setCountry(c);
              setPicking(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
