import React, { useState } from "react";
import { Bot, Camera, ExternalLink, ShieldAlert } from "lucide-react";
import { authenticatedFetch, SignInRequiredError } from "../lib/authenticatedFetch";

export default function TechnicalAssistant({ requestId }: { requestId: string }) {
  const [question, setQuestion] = useState("Give me a safe technical brief for this job.");
  const [images, setImages] = useState<string[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const addPhoto = (file?: File) => {
    if (!file) return;
    if (!/image\/(jpeg|png|webp)/.test(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Use a JPEG, PNG, or WebP photo smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImages((old) => [...old, String(reader.result)].slice(0, 3));
    reader.readAsDataURL(file);
  };

  const showRequestError = (caught: unknown) => {
    if (caught instanceof SignInRequiredError) setNeedsSignIn(true);
    setError(caught instanceof Error ? caught.message : "Assistant unavailable");
  };

  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNeedsSignIn(false);
    try {
      const response = await authenticatedFetch(`/api/requests/${requestId}/technical-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, images }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Assistant unavailable");
      setAnswer(body);
    } catch (caught) {
      showRequestError(caught);
    } finally {
      setLoading(false);
    }
  };

  const openSource = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/requests/${requestId}/technical-sources/${id}`);
      if (!response.ok) throw new Error((await response.json()).detail || "Source unavailable");
      const url = URL.createObjectURL(await response.blob());
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      showRequestError(caught);
    }
  };

  return <section className="p-5 rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 space-y-4">
    <div><h2 className="font-black flex gap-2"><Bot className="text-orange-600" /> AI Technical Assistant</h2><p className="text-xs text-gray-500">Assigned-worker-only guidance grounded in approved documents. This is separate from customer chat.</p></div>
    <form onSubmit={ask} className="space-y-3">
      <div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} className="flex-1 p-3 rounded-xl border bg-gray-50 dark:bg-slate-800" /><button disabled={loading} className="px-5 rounded-xl bg-orange-600 text-white font-bold">{loading ? "Working…" : "Ask"}</button></div>
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed cursor-pointer text-xs font-bold"><Camera className="w-4 h-4" /> Add authorized job photos ({images.length}/3)<input disabled={images.length >= 3} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => addPhoto(event.target.files?.[0])} /></label>
      {images.length > 0 && <div className="flex gap-2">{images.map((src, index) => <button type="button" key={src} onClick={() => setImages((old) => old.filter((_, itemIndex) => itemIndex !== index))}><img src={src} alt={`Job upload ${index + 1}`} className="h-16 w-16 rounded-xl object-cover" /></button>)}</div>}
    </form>
    {error && <div className="text-sm p-3 rounded-xl bg-rose-50 text-rose-700"><p>{error}</p>{needsSignIn && <a href="/login" className="inline-block mt-2 font-bold underline">Sign in again</a>}</div>}
    {answer && <div className="space-y-3 text-sm"><p>{answer.issue_summary}</p>{answer.worker_photo_observations?.length > 0 && <Box title="Visible in worker photos" items={answer.worker_photo_observations} />}<Box title="Suggested checks" items={answer.suggested_checks} /><Box title="Diagnostic questions" items={answer.diagnostic_questions} /><div className="p-3 bg-amber-50 text-amber-900 rounded-xl"><p className="font-bold flex gap-2"><ShieldAlert className="w-4 h-4" /> Stop conditions</p>{answer.stop_conditions?.join(" · ")}</div><div><p className="text-xs font-black uppercase text-gray-400">Approved sources · evidence {answer.evidence_sufficiency}</p>{answer.citations?.map((citation: any) => <button key={`${citation.id}-${citation.page}`} onClick={() => openSource(citation.id)} className="mt-2 mr-2 px-3 py-2 rounded-xl border text-xs font-bold inline-flex gap-2"><ExternalLink className="w-3 h-3" />{citation.title}{citation.page !== undefined ? ` · page ${Number(citation.page) + 1}` : ""}</button>)}{!answer.citations?.length && <p className="text-xs text-rose-600 mt-1">No approved source matched this question.</p>}</div>{answer.escalation_required && <p className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">Escalated for human review because approved evidence or qualifications were insufficient.</p>}</div>}
  </section>;
}

function Box({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <div><p className="text-xs font-black uppercase text-gray-400">{title}</p>{items.map((item) => <p key={item} className="mt-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">{item}</p>)}</div>;
}
