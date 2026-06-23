"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BadgeCheck,
  Zap,
  Heart,
  Lock,
  Clock,
  Globe,
  Check,
  Flag,
  RefreshCw,
} from "lucide-react";
import { CATEGORIES, avatarColor, flagOf } from "@/lib/constants";
import { saveForSave, reportUser, blockUser } from "@/app/actions";
import { SafetySheet } from "@/components/app/SafetySheet";
import type { FeedItem, Reputation } from "@/lib/feed";

function ReputationTag({ rep }: { rep: Reputation }) {
  if (rep.label === "New" || rep.rate == null) {
    return <span className="tag rep">New</span>;
  }
  const reliable = rep.label === "Reliable";
  return (
    <span className={"tag rep" + (reliable ? " reliable" : "")}>
      {reliable ? `Reliable · ${rep.rate}%` : `${rep.rate}% saved back`}
    </span>
  );
}

function FeedCard({
  p,
  saving,
  onSave,
  onFlag,
}: {
  p: FeedItem;
  saving: boolean;
  onSave: () => void;
  onFlag: () => void;
}) {
  return (
    <div className={"card" + (p.boosted ? " boosted" : "")}>
      <button
        className="iconbtn"
        title="Report or block"
        aria-label="Report or block"
        onClick={onFlag}
      >
        <Flag />
      </button>
      <div className="crow">
        <div className="av" style={{ background: avatarColor(p.name) }}>
          {p.name[0]?.toUpperCase()}
        </div>
        <div className="who">
          <h4>{p.name}</h4>
          <div className="tags">
            <span className="tag">
              {flagOf(p.country)} {p.country}
            </span>
            <span className="tag">{p.category}</span>
            <span className="tag verif">
              <BadgeCheck /> verified
            </span>
            <ReputationTag rep={p.reputation} />
            {p.boosted && (
              <span className="tag boost">
                <Zap /> Favored
              </span>
            )}
          </div>
        </div>
      </div>

      {p.blurb && <p className="blurb">{p.blurb}</p>}

      <div className="numrow">
        <div className="locked">
          <Lock /> <span className="dots">•••• ••• •••</span>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {p.saved_by_me ? (
          <button className="btn btn-wait">
            <Clock /> Saved, waiting for them…
          </button>
        ) : (
          <button className="btn btn-save" onClick={onSave} disabled={saving}>
            <Heart /> {saving ? "Saving…" : "Save for save"}
          </button>
        )}
      </div>
    </div>
  );
}

export function DiscoverFeed({
  items,
  scopedCountry,
  myCountry,
  myCategory,
}: {
  items: FeedItem[];
  scopedCountry: string | null;
  myCountry: string;
  myCategory: string;
}) {
  const router = useRouter();
  const [cat, setCat] = useState<string>("All");
  const [feed, setFeed] = useState(items);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [flagTarget, setFlagTarget] = useState<FeedItem | null>(null);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [, startTransition] = useTransition();

  // Keep the feed in sync with the server on refresh / revalidation.
  useEffect(() => {
    setFeed(items);
  }, [items]);

  const filtered = cat === "All" ? feed : feed.filter((p) => p.category === cat);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  // Throttled refresh: a short cooldown keeps people from hammering the feed.
  function refresh() {
    if (cooling) return;
    setCooling(true);
    router.refresh();
    setTimeout(() => setCooling(false), 6000);
  }

  function save(p: FeedItem) {
    setSavingId(p.id);
    startTransition(async () => {
      try {
        const { matched } = await saveForSave(p.id);
        setFeed((f) =>
          f.map((x) => (x.id === p.id ? { ...x, saved_by_me: true } : x)),
        );
        const first = p.name.split(" ")[0];
        flash(
          matched
            ? `You matched with ${first}. Their number is unlocked in Matches.`
            : `Saved ${first}. They can now save you back.`,
        );
      } catch (e) {
        flash(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      } finally {
        setSavingId(null);
      }
    });
  }

  function report() {
    const p = flagTarget;
    if (!p) return;
    setSafetyBusy(true);
    startTransition(async () => {
      try {
        await reportUser(p.id);
        setFeed((f) => f.filter((x) => x.id !== p.id));
        flash(`Reported ${p.name.split(" ")[0]}. Our team will review it.`);
      } catch (e) {
        flash(e instanceof Error ? e.message : "Couldn't send the report. Please try again.");
      } finally {
        setSafetyBusy(false);
        setFlagTarget(null);
      }
    });
  }

  function block() {
    const p = flagTarget;
    if (!p) return;
    setSafetyBusy(true);
    startTransition(async () => {
      try {
        await blockUser(p.id);
        setFeed((f) => f.filter((x) => x.id !== p.id));
        flash(`Blocked ${p.name.split(" ")[0]}. You won't see each other.`);
      } catch (e) {
        flash(e instanceof Error ? e.message : "Couldn't block. Please try again.");
      } finally {
        setSafetyBusy(false);
        setFlagTarget(null);
      }
    });
  }

  return (
    <>
      <div className="filters">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            className={"chip" + (cat === c ? " on" : "")}
            onClick={() => setCat(c)}
          >
            {c === "All" && <Sparkles />}
            {c}
          </button>
        ))}
      </div>

      <div className="body">
        <div className="lead">
          Discover{" "}
          <span className="sub">
            {scopedCountry
              ? `· ${flagOf(scopedCountry)} ${scopedCountry}`
              : `· ${flagOf(myCountry)} ${myCountry} and ${myCategory} first`}
          </span>
          <button
            className={"refreshbtn" + (cooling ? " spin" : "")}
            onClick={refresh}
            disabled={cooling}
            aria-label="Refresh feed"
          >
            <RefreshCw /> {cooling ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="ic">
              <Globe />
            </div>
            {scopedCountry ? (
              <>
                <h3>No one in {scopedCountry} yet</h3>
                <p>
                  Try another country or your home feed. You can also invite
                  people to join.
                </p>
              </>
            ) : (
              <>
                <h3>No one to save yet</h3>
                <p>
                  Share your invite link from the You tab. People appear here as
                  they join.
                </p>
              </>
            )}
          </div>
        ) : (
          filtered.map((p) => (
            <FeedCard
              key={p.id}
              p={p}
              saving={savingId === p.id}
              onSave={() => save(p)}
              onFlag={() => setFlagTarget(p)}
            />
          ))
        )}
      </div>

      {toast && (
        <div className="toast">
          <Check /> {toast}
        </div>
      )}

      {flagTarget && (
        <SafetySheet
          name={flagTarget.name}
          busy={safetyBusy}
          onReport={report}
          onBlock={block}
          onClose={() => setFlagTarget(null)}
        />
      )}
    </>
  );
}
