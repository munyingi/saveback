"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Sparkles, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { CATEGORIES, flagOf, DEFAULT_COUNTRY } from "@/lib/constants";
import { CountryPicker } from "@/components/CountryPicker";
import { completeOnboarding } from "@/app/actions";

export function OnboardingForm({
  defaultCountry = DEFAULT_COUNTRY,
}: {
  defaultCountry?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [category, setCategory] = useState<string>("Business");
  const [blurb, setBlurb] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    if (!name.trim()) {
      setError("Please add your name.");
      return;
    }
    startTransition(async () => {
      try {
        await completeOnboarding({ name, country, category, blurb });
        router.replace("/discover");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  if (picking) {
    return (
      <div className="picker">
        <div className="picker-hd">
          <button className="back" onClick={() => setPicking(false)}>
            <ArrowLeft /> Back
          </button>
          <b>Your country</b>
        </div>
        <p className="picker-sub">
          People are grouped by country, so choose yours. You can browse other
          countries later.
        </p>
        <CountryPicker
          selected={country}
          onPick={(c) => {
            setCountry(c);
            setPicking(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="brand">
        <b>
          Save<span>Back</span>
        </b>
        <small>save for save</small>
      </div>

      <h1 style={{ marginTop: 18 }}>
        Set up your
        <br />
        <span>profile.</span>
      </h1>
      <p className="tg">
        This is what others see. Your phone and email never appear here.
      </p>

      <div className="fld">
        <label>Name</label>
        <div className="inp">
          <User />
          <input
            value={name}
            placeholder="e.g. Sam"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="fld">
        <label>Your country</label>
        <button className="chip-country" onClick={() => setPicking(true)}>
          <span className="fl">{flagOf(country)}</span> {country}{" "}
          <span className="chg">change</span>
        </button>
      </div>

      <div className="fld">
        <label>Category</label>
        <div className="opts">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={"opt" + (category === c ? " on" : "")}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="fld">
        <label>Short blurb</label>
        <div className="inp">
          <Sparkles />
          <input
            value={blurb}
            placeholder="What you're about"
            maxLength={160}
            onChange={(e) => setBlurb(e.target.value)}
          />
        </div>
      </div>

      <div className="lockmsg">
        <Lock /> Your number only unlocks when you both save.
      </div>

      {error && <p className="errmsg">{error}</p>}

      <div className="go">
        <button className="btn btn-save" onClick={submit} disabled={pending}>
          {pending ? (
            "Saving…"
          ) : (
            <>
              Enter SaveBack <ArrowRight />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
