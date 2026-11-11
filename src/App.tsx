import { ArrowUpRight, Code2, FileSearch } from "lucide-react";
import KnowledgeLab from "./lab/KnowledgeLab";

export default function App() {
  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault(); document.getElementById("main-content")?.focus();
    }}>Skip to the lab</a>
    <header className="app-header"><div className="shell app-header-inner">
      <a href="/" className="app-brand"><FileSearch size={26} /><span>Knowledge Lab<span className="brand-dot">.</span></span></a>
      <nav aria-label="Project navigation">
        <a href="/data/build-notes.md" download>Documentation <ArrowUpRight size={14} /></a>
        <a href="https://github.com/Simonsbs/knowledge-assistant-lab" target="_blank" rel="noopener noreferrer"><Code2 size={16} /> Source</a>
      </nav>
    </div></header>
    <main id="main-content" tabIndex={-1}><KnowledgeLab /></main>
    <footer className="app-footer shell"><span>An independent project by <a href="https://bestdev.co.il/" target="_blank" rel="noopener noreferrer">Simon Stirling</a>.</span>
      <span>Synthetic data. Reproducible evaluation. Source you can inspect.</span></footer>
  </>;
}
