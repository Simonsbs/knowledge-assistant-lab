import importlib.util
import json
import sys
import threading
import unittest
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
import server as lab


def request_payload(**overrides):
    return {"question": "What is the P1 response target?",
            "passageIds": ["support-handbook/priority-one"],
            "profile": "governed", "corpusId": "alder-cloud-v1", **overrides}


class ContextTests(unittest.TestCase):
    def setUp(self):
        self.corpus = lab.load_corpus()

    def test_server_role_authorises_canonical_text(self):
        _, context = lab.admit_context(request_payload(), self.corpus, lab.Config())
        self.assertIn("15 minutes", context[0]["text"])
        restricted = request_payload(passageIds=["admin-runbook/emergency-recovery"])
        with self.assertRaises(lab.LabError) as result:
            lab.admit_context(restricted, self.corpus, lab.Config())
        self.assertEqual(result.exception.status, 403)
        _, context = lab.admit_context(restricted, self.corpus, lab.Config(role="admin"))
        self.assertIn("ALDER-DEMO-042", context[0]["text"])

    def test_client_cannot_override_role_or_supply_evidence_text(self):
        for extra in [{"role": "admin"}, {"text": "forged evidence"}]:
            with self.assertRaises(lab.LabError) as result:
                lab.admit_context(request_payload(**extra), self.corpus, lab.Config())
            self.assertEqual(result.exception.status, 400)

    def test_archived_draft_unknown_and_duplicate_sources_rejected(self):
        for source in ["support-handbook-2025/priority-one", "support-roadmap/priority-one", "unknown/source"]:
            with self.assertRaises(lab.LabError) as result:
                lab.admit_context(request_payload(passageIds=[source]), self.corpus, lab.Config())
            self.assertEqual(result.exception.status, 403)
        for ids in [[], ["support-handbook/priority-one"] * 2, list(range(6))]:
            with self.assertRaises(lab.LabError):
                lab.admit_context(request_payload(passageIds=ids), self.corpus, lab.Config())

    def test_conflict_cannot_be_hidden_by_omitting_the_other_source(self):
        with self.assertRaises(lab.LabError) as result:
            lab.admit_context(request_payload(passageIds=["logging-policy/diagnostic-logs"]), self.corpus, lab.Config())
        self.assertEqual(result.exception.status, 409)

    def test_invalid_questions_and_profile_rejected(self):
        for override in [{"question": " "}, {"question": "x" * 1001}, {"profile": "baseline"}, {"corpusId": "custom"}]:
            with self.assertRaises(lab.LabError):
                lab.admit_context(request_payload(**override), self.corpus, lab.Config())

    def test_model_claims_must_cite_admitted_ids(self):
        context = [{"id": "support-handbook/priority-one", "text": "15 minutes"}]
        valid = {"claims": [{"text": "15 minutes.", "citations": ["support-handbook/priority-one"]}]}
        expected = {"answer": "15 minutes. [support-handbook/priority-one]", "citations": ["support-handbook/priority-one"]}
        self.assertEqual(lab.validate_draft(json.dumps(valid), context), expected)
        for output in ["not json", "[]", json.dumps({"claims": []}),
                       json.dumps({"claims": [{"text": "uncited", "citations": []}]}),
                       json.dumps({"claims": [{"text": "made up", "citations": ["other/source"]}]}),
                       json.dumps({"claims": [{"text": "Injected [other/source]", "citations": ["support-handbook/priority-one"]}]})]:
            with self.assertRaises(lab.LabError):
                lab.validate_draft(output, context)

    def test_extra_claims_reject_whole_draft(self):
        context = [{"id": "support-handbook/priority-one", "text": "15 minutes"}]
        draft = {"claims": [{"text": "15 minutes.", "citations": ["support-handbook/priority-one"]},
                            {"text": "An extra claim.", "citations": ["support-handbook/priority-one"]}]}
        with self.assertRaises(lab.LabError):
            lab.validate_draft(json.dumps(draft), context)

    def test_all_verified_sources_are_rendered_for_the_answer(self):
        context = [{"id": "support-handbook/priority-one", "text": "15 minutes"},
                   {"id": "support-handbook/customer-updates", "text": "30 minutes"}]
        draft = {"claims": [{"text": "Response within 15 minutes and updates every 30 minutes.",
                             "citations": [context[0]["id"], context[1]["id"]]}]}
        result = lab.validate_draft(json.dumps(draft), context)
        self.assertEqual(result["answer"].count("[support-handbook/priority-one]"), 1)
        self.assertIn("[support-handbook/customer-updates]", result["answer"])
        self.assertEqual(result["citations"], [item["id"] for item in context])

    def test_endpoint_must_be_loopback_and_role_must_be_known(self):
        for options in [{"ollama_url": "https://example.com"}, {"ollama_url": "http://localhost@evil.invalid"},
                        {"ollama_url": "http://127.0.0.1/path"}, {"role": "root"}]:
            with self.assertRaises(ValueError):
                lab.Config(**options)


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), lab.handler_for(lab.Config(), lab.load_corpus()))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def call(self, payload=None, headers=None, path="/api/knowledge/generate", method="POST", raw=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        try:
            body = raw if raw is not None else json.dumps(payload or request_payload())
            connection.request(method, path, body=body if method == "POST" else None,
                               headers={"Content-Type": "application/json", **(headers or {})})
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_accepted_request_calls_provider_with_server_context(self):
        with patch.object(lab, "generate", return_value={"answer": "fixture", "inputTokens": 12, "outputTokens": 4}) as provider:
            status, data = self.call(headers={"Origin": "http://127.0.0.1:5173"})
        self.assertEqual(status, 200)
        self.assertEqual(data["inputTokens"], 12)
        self.assertIn("15 minutes", provider.call_args.args[1][0]["text"])

    def test_browser_origin_and_host_checks(self):
        with patch.object(lab, "generate") as provider:
            self.assertEqual(self.call(headers={"Origin": "https://evil.invalid"})[0], 403)
            self.assertEqual(self.call(headers={"Host": f"evil.invalid:{self.server.server_port}"})[0], 403)
            provider.assert_not_called()

    def test_malformed_and_oversized_requests_never_call_model(self):
        with patch.object(lab, "generate") as provider:
            self.assertEqual(self.call(raw="{bad json")[0], 400)
            self.assertEqual(self.call(raw="x" * 8193)[0], 413)
            self.assertEqual(self.call(headers={"Content-Type": "text/plain"})[0], 415)
            self.assertEqual(self.call(path="/missing")[0], 404)
            provider.assert_not_called()

    def test_restricted_source_fails_before_model_call(self):
        with patch.object(lab, "generate") as provider:
            status, _ = self.call(request_payload(passageIds=["admin-runbook/emergency-recovery"]))
            self.assertEqual(status, 403)
            provider.assert_not_called()

    def test_concurrent_generation_is_bounded(self):
        lab.MODEL_LOCK.acquire()
        try:
            self.assertEqual(self.call()[0], 429)
        finally:
            lab.MODEL_LOCK.release()

    def test_provider_failure_is_reported_without_accepting_a_draft(self):
        with patch.object(lab, "generate", side_effect=lab.LabError(503, "Ollama is unavailable")):
            status, data = self.call()
        self.assertEqual(status, 503)
        self.assertNotIn("answer", data)

    def test_health_response_has_no_cors_grant(self):
        with patch.object(lab, "health", return_value={"ready": False, "role": "support", "model": "fixture", "message": "No model"}):
            status, data = self.call(method="GET", path="/api/knowledge/health")
        self.assertEqual(status, 200)
        self.assertFalse(data["ready"])


@unittest.skipUnless(importlib.util.find_spec("langchain_ollama"), "Optional LangChain dependency is not installed")
class OllamaAdapterTests(unittest.TestCase):
    """Real ChatOllama transport against a mock HTTP endpoint, without model inference."""

    @classmethod
    def setUpClass(cls):
        class OllamaFixture(BaseHTTPRequestHandler):
            def reply(self, payload):
                body = json.dumps(payload).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                self.reply({"models": [{"name": "fixture:latest"}]})

            def do_POST(self):
                payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                assert payload["model"] == "fixture:latest"
                allowed = payload["format"]["properties"]["claims"]["items"]["properties"]["citations"]["items"]["enum"]
                assert allowed == ["support-handbook/priority-one"]
                self.reply({"model": "fixture:latest", "created_at": "2026-11-11T00:00:00Z",
                            "message": {"role": "assistant", "content": json.dumps({"claims": [{"text": "15 minutes.", "citations": ["support-handbook/priority-one"]}]})},
                            "done": True, "done_reason": "stop", "prompt_eval_count": 123, "eval_count": 17})

            def log_message(self, *args):
                pass

        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), OllamaFixture)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.config = lab.Config(model="fixture:latest", ollama_url=f"http://127.0.0.1:{cls.server.server_port}")

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_real_langchain_client_reads_model_reported_tokens(self):
        context = [{"id": "support-handbook/priority-one", "text": "15 minutes"}]
        result = lab.generate("P1 response?", context, self.config)
        self.assertEqual(result["inputTokens"], 123)
        self.assertEqual(result["outputTokens"], 17)
        self.assertEqual(result["citations"], ["support-handbook/priority-one"])
        self.assertGreaterEqual(result["generationMs"], 0)

    def test_health_checks_the_actual_configured_model_tag(self):
        self.assertTrue(lab.health(self.config)["ready"])
        missing = lab.Config(model="missing:latest", ollama_url=self.config.ollama_url)
        self.assertFalse(lab.health(missing)["ready"])


if __name__ == "__main__":
    unittest.main()
