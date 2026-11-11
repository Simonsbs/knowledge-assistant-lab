import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from evaluate_live import answer_pattern_checks


class AnswerChecksTests(unittest.TestCase):
    def test_citation_keywords_cannot_satisfy_answer_content_checks(self):
        rejected = answer_pattern_checks("Workspace administrators. [identity-guide/multi-factor-authentication]", ["multi.factor"])
        self.assertFalse(rejected[0]["passed"])
        accepted = answer_pattern_checks("A workspace administrator can require multi-factor authentication. [identity-guide/multi-factor-authentication]", ["multi.factor"])
        self.assertTrue(accepted[0]["passed"])


if __name__ == "__main__":
    unittest.main()
