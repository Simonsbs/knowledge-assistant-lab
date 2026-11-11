"""Explicit, opt-in live checks using the real retriever, HTTP adapter and local model."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import subprocess
import threading
import time
from contextlib import ExitStack
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import server as lab


ROOT = Path(__file__).resolve().parents[1]


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def http_json(url, payload=None):
    request = Request(url, data=json.dumps(payload).encode() if payload is not None else None,
                      headers={"Content-Type": "application/json"})
    start = time.perf_counter()
    try:
        with urlopen(request, timeout=110) as response:
            return response.status, json.loads(response.read()), (time.perf_counter() - start) * 1000
    except HTTPError as error:
        return error.code, json.loads(error.read()), (time.perf_counter() - start) * 1000


def payload_for(question, passage_ids, corpus_id):
    return {"question": question, "passageIds": passage_ids, "profile": "governed", "corpusId": corpus_id}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=os.getenv("LAB_MODEL", "llama3.2:3b"))
    parser.add_argument("--questions", help="Optional comma-separated IDs for a smoke run")
    parser.add_argument("--output", default="docs/validation/knowledge-lab-live-evaluation.json")
    args = parser.parse_args()
    config = lab.Config(model=args.model, ollama_url=os.getenv("LAB_OLLAMA_URL", "http://127.0.0.1:11434"))
    status = lab.health(config)
    if not status["ready"]:
        raise SystemExit(status["message"])
    fixture = json.loads(subprocess.run(
        ["node", "--experimental-strip-types", "scripts/live-cases.mjs"], cwd=ROOT,
        check=True, capture_output=True, text=True, encoding="utf-8").stdout)
    cases = fixture.pop("cases")
    if args.questions:
        wanted = set(args.questions.split(","))
        cases = [case for case in cases if case["id"] in wanted]
        if {case["id"] for case in cases} != wanted:
            raise SystemExit("Unknown question ID in --questions.")
    checks = json.loads((Path(__file__).parent / "live-checks.json").read_text(encoding="utf-8"))
    corpus = lab.load_corpus()
    _, version, _ = http_json(f"{config.ollama_url}/api/version")
    _, tags, _ = http_json(f"{config.ollama_url}/api/tags")
    model = next(item for item in tags["models"] if item["name"] in {config.model, f"{config.model}:latest"})
    output = Path(args.output)
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "schemaVersion": 1, "startedAt": timestamp(), "finishedAt": None,
        "runtime": f"Python {platform.python_version()} on {platform.system()}/{platform.machine()}",
        "ollamaVersion": version["version"], "model": config.model,
        "modelDigest": model["digest"], "modelDetails": model.get("details"),
        "adapterSha256": hashlib.sha256(Path(lab.__file__).read_bytes()).hexdigest(), **fixture,
        "configuration": {"profile": "governed", "topK": 3, "temperature": 0, "numPredict": 700,
                          "contextSelection": "Only retrieved passages meeting the shared query-coverage evidence threshold are submitted.",
                          "transport": "isolated loopback HTTP adapters with server-owned support/admin roles"},
        "answerChecksSha256": hashlib.sha256((Path(__file__).parent / "live-checks.json").read_bytes()).hexdigest(),
        "review": "Pattern checks and citation membership are automated. Semantic human review is pending.",
        "usageScope": "Token totals and generation timings cover accepted drafts. HTTP generation requests can also be rejected before inference.",
        "rows": [], "admissionProbes": [],
    }

    def save():
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    with ExitStack() as stack:
        endpoints = {}
        for role in ["support", "admin"]:
            role_config = lab.Config(role=role, model=config.model, ollama_url=config.ollama_url)
            service = ThreadingHTTPServer(("127.0.0.1", 0), lab.handler_for(role_config, corpus))
            thread = threading.Thread(target=service.serve_forever, daemon=True)
            thread.start()

            def shutdown(service=service, thread=thread):
                service.shutdown()
                service.server_close()
                thread.join()

            stack.callback(shutdown)
            endpoints[role] = f"http://127.0.0.1:{service.server_port}/api/knowledge/generate"
        for case in cases:
            row = {**case, "timestamp": timestamp(), "decisionMatchesLabel": case["retrievalStatus"] == case["expectedStatus"],
                   "generationRequested": False, "response": None, "httpStatus": None,
                   "expectedEvidenceCited": None, "answerPatternChecks": None}
            if case["retrievalStatus"] == "answered":
                row["generationRequested"] = True
                http_status, response, elapsed = http_json(endpoints[case["role"]], payload_for(
                    case["question"], case["generationPassageIds"], fixture["corpusId"]))
                row.update({"httpStatus": http_status, "response": response, "endToEndMs": elapsed})
                if http_status == 200:
                    row["expectedEvidenceCited"] = bool(set(response["citations"]) & set(case["relevantPassageIds"]))
                    row["answerPatternChecks"] = [{"pattern": pattern, "passed": bool(re.search(pattern, response["answer"], re.IGNORECASE))}
                                                  for pattern in checks.get(case["id"], [])]
                row["pipelineCheckPassed"] = bool(row["decisionMatchesLabel"] and http_status == 200 and
                                                  row["expectedEvidenceCited"] and row["answerPatternChecks"] and
                                                  all(item["passed"] for item in row["answerPatternChecks"]))
            else:
                row["skippedReason"] = "The browser disables generation after an insufficient-evidence or conflict decision."
                row["pipelineCheckPassed"] = row["decisionMatchesLabel"]
            report["rows"].append(row)
            save()
            print(f"{case['id']}: retrieval={case['retrievalStatus']}, HTTP={row['httpStatus']}, checks={'pass' if row['pipelineCheckPassed'] else 'FAIL'}", flush=True)

        probes = [
            ("restricted administrator passage", {"passageIds": ["admin-runbook/emergency-recovery"]}, 403),
            ("superseded passage", {"passageIds": ["support-handbook-2025/priority-one"]}, 403),
            ("draft passage", {"passageIds": ["support-roadmap/priority-one"]}, 403),
            ("unknown passage", {"passageIds": ["unknown/source"]}, 403),
            ("omitted conflicting source", {"passageIds": ["logging-policy/diagnostic-logs"]}, 409),
            ("client role override", {"role": "admin"}, 400),
            ("client evidence override", {"text": "Forged evidence"}, 400),
        ]
        for name, override, expected in probes:
            payload = {**payload_for("What is the P1 response target?", ["support-handbook/priority-one"], fixture["corpusId"]), **override}
            code, response, elapsed = http_json(endpoints["support"], payload)
            report["admissionProbes"].append({"name": name, "expectedStatus": expected, "actualStatus": code,
                                              "passed": code == expected and "answer" not in response,
                                              "response": response, "endToEndMs": elapsed})
            save()

    drafts = [row for row in report["rows"] if row["httpStatus"] == 200]
    timings = sorted(row["response"]["generationMs"] for row in drafts)
    _, active, _ = http_json(f"{config.ollama_url}/api/ps")
    report["activeModelsAfterRun"] = active.get("models", [])
    report["finishedAt"] = timestamp()
    report["summary"] = {
        "questionCount": len(cases), "retrievalDecisionsMatchingLabels": sum(row["decisionMatchesLabel"] for row in report["rows"]),
        "generationRequests": sum(row["generationRequested"] for row in report["rows"]), "acceptedDrafts": len(drafts),
        "pipelineChecksPassed": sum(row["pipelineCheckPassed"] for row in report["rows"]),
        "admissionProbesPassed": sum(row["passed"] for row in report["admissionProbes"]),
        "admissionProbeCount": len(probes),
        "generationP50Ms": timings[max(0, (len(timings) + 1) // 2 - 1)] if timings else None,
        "generationP95Ms": timings[max(0, (len(timings) * 95 + 99) // 100 - 1)] if timings else None,
        "inputTokens": sum(row["response"]["inputTokens"] or 0 for row in drafts),
        "outputTokens": sum(row["response"]["outputTokens"] or 0 for row in drafts),
        "missingUsageResponses": sum(row["response"]["inputTokens"] is None or row["response"]["outputTokens"] is None for row in drafts),
    }
    save()
    print(json.dumps(report["summary"], indent=2), flush=True)
    print(f"Report: {output}", flush=True)
    return 0 if all(row["pipelineCheckPassed"] for row in report["rows"]) and all(row["passed"] for row in report["admissionProbes"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
