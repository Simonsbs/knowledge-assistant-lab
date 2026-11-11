import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, FlaskConical, MessageSquareText } from "lucide-react";
import { Eyebrow, PageMeta } from "../components/UI";
import corpusData from "../data/corpus.json";
import questionData from "../data/questions.json";
import reportData from "../data/evaluation.json";
import { ask, DEFAULT_SETTINGS, validateCorpus } from "./engine";
import type { Corpus, Settings } from "./engine";
import type { EvaluationRun, LabelledQuestion } from "./evaluation";
import QueryWorkbench from "./QueryWorkbench";
import EvaluationPanel from "./EvaluationPanel";
import CorpusPanel from "./CorpusPanel";
import "./knowledge.css";

validateCorpus(corpusData);
const sampleCorpus: Corpus = corpusData;
const labels = questionData as LabelledQuestion[];
type Tab = "ask" | "evaluation" | "sources";
const tabs = [
  { id: "ask", label: "Ask & inspect", icon: MessageSquareText },
  { id: "evaluation", label: "Evaluation lab", icon: FlaskConical },
  { id: "sources", label: "Knowledge base", icon: BookOpen },
] as const;

export default function KnowledgeLab() {
  const [tab, setTab] = useState<Tab>("ask");
  const [corpus, setCorpus] = useState(sampleCorpus);
  const [custom, setCustom] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [question, setQuestion] = useState(labels[0].question);
  const [submitted, setSubmitted] = useState(labels[0].question);
  const [revision, setRevision] = useState(0);
  const [runs, setRuns] = useState(reportData.runs as EvaluationRun[]);
  const [runSource, setRunSource] = useState("Recorded Node runs");
  const answer = useMemo(() => submitted ? ask(corpus, submitted, settings) : null,
    [corpus, submitted, settings, revision]);
  const passageCount = corpus.documents.reduce((sum, doc) => sum + doc.passages.length, 0);

  function inspect(label: LabelledQuestion, run: EvaluationRun) {
    setSettings({ profile: run.profile, topK: run.topK, role: label.role });
    setQuestion(label.question);
    setSubmitted(label.question);
    setTab("ask");
  }

  function loadPack(pack: Corpus, isCustom: boolean) {
    setCorpus(pack);
    setCustom(isCustom);
    setSubmitted("");
    setQuestion("");
  }

  return (
    <section className="knowledge-lab shell" aria-labelledby="lab-title">
      <PageMeta title="Knowledge assistant & evaluation lab"
        description="Ask a synthetic company knowledge base, inspect cited evidence and compare real retrieval evaluation runs. A public portfolio demonstrator by Simon Stirling." />
      <a href="https://bestdev.co.il/#/projects" className="lab-back"><ArrowLeft size={15} /> All projects by Simon Stirling</a>
      <div className="lab-heading">
        <div>
          <Eyebrow>PUBLIC DEMONSTRATOR / SYNTHETIC DATA</Eyebrow>
          <h1 id="lab-title">Knowledge.<br /><span>With the evidence.</span></h1>
          <p>A support team needs answers it can check. Ask a question, follow the sources
            and see what happens when the knowledge base disagrees.</p>
        </div>
        <div className="lab-summary">
          <span className="lab-mode"><span /> Browser evidence mode</span>
          <p>Exact source quotations. No model call.<br />Optional local Ollama inference.</p>
          <a href="/data/build-notes.md" className="text-link" download>
            Download build notes <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      <div className="lab-facts" aria-label="Knowledge pack summary">
        <span><strong>{corpus.documents.length}</strong> documents</span>
        <span><strong>{passageCount}</strong> passages</span>
        <span><strong>{labels.length}</strong> labelled sample questions</span>
        <span className="lab-pack-label">{custom ? "Your local pack" : "Fictional company"}: {corpus.title}</span>
      </div>
      <nav className="lab-tabs" aria-label="Lab views">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>
            <Icon size={17} /> {label}
          </button>
        ))}
      </nav>
      {tab === "ask" && <QueryWorkbench corpus={corpus} custom={custom} settings={settings}
        setSettings={setSettings} question={question} setQuestion={setQuestion} answer={answer}
        onAsk={(value) => { setQuestion(value); setSubmitted(value.trim()); setRevision((value) => value + 1); }} />}
      {tab === "evaluation" && <EvaluationPanel corpus={sampleCorpus} labels={labels} custom={custom}
        runs={runs} runSource={runSource} onRuns={(value) => { setRuns(value); setRunSource("Measured in this browser"); }}
        onInspect={inspect} onRestore={() => loadPack(sampleCorpus, false)} />}
      {tab === "sources" && <CorpusPanel corpus={corpus} custom={custom} role={settings.role}
        onLoad={(pack) => loadPack(pack, true)} onRestore={() => loadPack(sampleCorpus, false)} />}
      <div className="lab-boundary">
        <div><strong>What this demonstrates</strong><a href="/data/build-notes.md" className="lab-notes-link" download>Architecture & walkthrough (Markdown)</a></div>
        <p>Lexical retrieval, source inspection, abstention heuristics and labelled conflict checks.
          Demo roles simulate filtering over a public synthetic pack. They do not protect private
          information. Semantic answer quality still needs human review.</p>
      </div>
    </section>
  );
}
