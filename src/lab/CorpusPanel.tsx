import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, FileText, RotateCcw, Upload } from "lucide-react";
import { validateCorpus } from "./engine";
import type { Corpus, Role } from "./engine";
import { downloadJson } from "./download";

export default function CorpusPanel({ corpus, role, custom, onLoad, onRestore }: {
  corpus: Corpus; role: Role; custom: boolean; onLoad: (value: Corpus) => void; onRestore: () => void;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const visible = corpus.documents.filter((doc) => doc.roles.includes(role));

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError(""); setNotice("");
    try {
      if (selected.size > 2_000_000) throw new Error("Choose a JSON pack smaller than 2 MB.");
      const pack: unknown = JSON.parse(await selected.text());
      validateCorpus(pack);
      onLoad(pack);
      setNotice(`Loaded ${pack.title}. This pack stays in memory in this browser tab.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not read this knowledge pack."); }
  }

  return (
    <div className="lab-corpus"><div className="lab-section-heading"><div><span className="section-kicker">THE KNOWLEDGE BEHIND THE ANSWER</span>
      <h2>Open the source.</h2><p>{corpus.description}</p></div><div className="lab-eval-actions">
        <button className="button button-secondary" onClick={() => downloadJson(corpus, `${corpus.id}.json`)}><Download size={15} /> Download pack</button>
        <button className="button button-secondary" onClick={() => file.current?.click()}><Upload size={15} /> Load JSON pack</button>
        {custom && <button className="text-link" onClick={() => { onRestore(); setNotice("Restored the Alder Cloud sample pack."); }}><RotateCcw size={14} /> Restore sample</button>}
        <input hidden ref={file} type="file" accept=".json,application/json" aria-label="Import a knowledge pack" onChange={upload} />
      </div></div>
      <div className="lab-corpus-note"><p>Showing {visible.length} documents available to the <strong>{role === "support" ? "support analyst" : "administrator"}</strong> demo role, including archives and drafts. Governed retrieval uses only current sources. Change the role in Ask & inspect.</p>
        <p>As of {corpus.asOf}. Download a pack to inspect its JSON structure. Imports are validated, held in this tab and cleared on reload. Only use synthetic or public information.</p></div>
      {error && <p role="alert" className="lab-error">{error}</p>}{notice && <p className="lab-notice" role="status">{notice}</p>}
      <div className="lab-document-list">{visible.map((doc) => <details className="lab-document" key={doc.id}>
        <summary><FileText size={20} /><span><strong>{doc.title}</strong><span>{doc.owner} · Updated {doc.updatedAt} · {doc.passages.length} passages</span></span>
          <span className={`lab-source-status lab-status-${doc.status}`}>{doc.status}</span></summary>
        <div>{doc.passages.map((passage) => <section key={passage.id}><h3>{passage.heading}</h3><p>{passage.text}</p>
          <code>{passage.id}</code>{passage.fact && <span className="lab-fact-label">Labelled fact: {passage.fact.key} = {passage.fact.value}</span>}</section>)}</div>
      </details>)}</div>
    </div>
  );
}
