"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { trackEngagement } from "@/components/seo/engagement-events";

type SubmissionState = "idle" | "sending" | "success" | "error";
type Interest = "updates" | "reports" | "collaboration";

const copy = {
  ko: {
    title: "읽을거리 업데이트",
    description: "AI · Bio · Assets의 새 공개 글과 리포트 업데이트를 가끔 전합니다.",
    email: "이메일 주소",
    updates: "새 글",
    reports: "리포트 업데이트",
    collaboration: "리서치·콘텐츠 협업",
    submit: "알림 받기",
    sending: "전송 중…",
    privacy: "입력한 이메일은 요청 회신과 업데이트 전달을 위해서만 사용됩니다.",
    success: "요청을 받았습니다. 확인되는 대로 알려드리겠습니다.",
    unavailable: "지금은 요청을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.",
    genericError: "전송하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
  en: {
    title: "Reading updates",
    description: "Occasional updates on new public writing and reports across AI, Bio, and Assets.",
    email: "Email address",
    updates: "New writing",
    reports: "Report updates",
    collaboration: "Research & content collaboration",
    submit: "Keep me updated",
    sending: "Sending…",
    privacy: "Your email is used only to respond to this request and send the updates you select.",
    success: "Your request was received. We will be in touch once it is confirmed.",
    unavailable: "Requests are unavailable right now. Please try again shortly.",
    genericError: "We could not send your request. Please try again shortly.",
  },
} as const;

export function ReaderUpdatesForm() {
  const { language } = useLanguage();
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<Interest[]>(["updates"]);
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

  const toggleInterest = (interest: Interest) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (interests.length === 0) return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/reader-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interests, website: "" }),
      });

      if (response.ok) {
        trackEngagement("reader_update_submitted", { interest_count: interests.length });
        setStatus("success");
        setMessage(t.success);
        setEmail("");
        return;
      }

      setStatus("error");
      setMessage(response.status === 503 ? t.unavailable : t.genericError);
    } catch {
      setStatus("error");
      setMessage(t.genericError);
    }
  };

  return (
    <section aria-labelledby="reader-updates-title" className="w-full max-w-xl rounded-2xl border border-border bg-muted/25 p-5">
      <h2 id="reader-updates-title" className="text-base font-bold text-foreground">{t.title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.description}</p>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="reader-updates-email">{t.email}</label>
        <input
          id="reader-updates-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.email}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <fieldset>
          <legend className="sr-only">{t.title}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(["updates", "reports", "collaboration"] as const).map((interest) => (
              <label key={interest} className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  className="size-4 rounded border-border accent-primary"
                />
                {t[interest]}
              </label>
            ))}
          </div>
        </fieldset>
        <input tabIndex={-1} aria-hidden="true" className="hidden" name="website" autoComplete="off" />
        <button
          type="submit"
          disabled={status === "sending" || interests.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? t.sending : t.submit}
        </button>
        <p className="text-xs leading-5 text-muted-foreground">{t.privacy}</p>
        {message && (
          <p role="status" className={status === "success" ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
