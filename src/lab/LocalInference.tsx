import { useEffect, useRef, useState } from "react";
import { Cpu, LoaderCircle } from "lucide-react";
import type { Answer, Role } from "./engine";
import { generationPassageIds } from "./engine";

interface Health { ready: boolean; role: Role; model: string; message: string }
interface ModelResult {
  answer: string;
  citations: string[];
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  generationMs: number;
  citationCheck: string;
}

export default function LocalInference({ answer, custom }: { answer: Answer; custom: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port === "5173";
  useEffect(() => {
    setResult(null); setError(""); setBusy(false);
    request.current?.abort();
    return () => request.current?.abort();
  }, [answer, custom]);

  async function connect() {
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/knowledge/health", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]) });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Use npm run dev and start npm run lab:serve, then connect again.");
      const data = await response.json() as Health;
      if (typeof data.ready !== "boolean" || !["support", "admin"].includes(data.role)) throw new Error("The local service returned an unexpected health response.");
      if (!controller.signal.aborted) setHealth(data);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Cannot reach the local inference service.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  async function generate() {
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/knowledge/generate", {
        method: "POST", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(100_000)]),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: answer.question, passageIds: generationPassageIds(answer),
          profile: answer.settings.profile, corpusId: "alder-cloud-v1" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Local generation failed.");
      if (!controller.signal.aborted) setResult(data as ModelResult);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Local generation failed.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  return (
    <details className="lab-local">
      <summary><Cpu size={17} /> Optional local inference <span>Python / LangChain / Ollama</span></summary>
      <div><p>A local model can draft an answer from the retrieved passages that meet the evidence threshold. Citation IDs are checked automatically; whether the answer follows from its evidence needs human review.</p>
        {isLocal ? <>
          <button className="button button-secondary" onClick={connect} disabled={busy}>{busy && <LoaderCircle size={15} className="lab-spinner" />}Check local service</button>
          {health && <p className="lab-field-hint">{health.message} Model: {health.model}. Server role: {health.role}.</p>}
          {health?.ready && <button className="button button-primary" onClick={generate}
            disabled={busy || custom || answer.status !== "answered" || answer.settings.profile !== "governed" || answer.settings.role !== health.role}>
            {busy && <LoaderCircle size={15} className="lab-spinner" />} Draft with local model
          </button>}
          <p className="lab-field-hint">Local inference uses the sample pack, governed retrieval, a matching server role and a question with evidence. See the build notes for setup.</p>
        </> : <p className="lab-field-hint">Use the local development server to connect Ollama. The static demo works entirely in browser evidence mode.</p>}
        {error && <p className="lab-error" role="alert">{error}</p>}
        {result && <div className="lab-model-result"><h3>Local model draft</h3><p className="lab-model-answer">{result.answer}</p>
          <p className="lab-field-hint">{result.model} · {result.generationMs.toFixed(0)} ms · Input tokens: {result.inputTokens ?? "not reported"} · Output tokens: {result.outputTokens ?? "not reported"}</p>
          <p className="lab-field-hint">{result.citationCheck} Human semantic review required.</p></div>}
      </div>
    </details>
  );
}
