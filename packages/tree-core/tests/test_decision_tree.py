import json
import unittest

from grove.decision_tree import DecisionTreeClassifier


class DecisionTreeTests(unittest.TestCase):
    def test_finds_a_perfect_split(self):
        tree = DecisionTreeClassifier().fit(
            [[0], [1], [2], [3]], ["A", "A", "B", "B"], ["Feature 1"]
        )
        result = tree.result()
        self.assertEqual(result["bestSplit"]["threshold"], 1.5)
        self.assertAlmostEqual(result["bestSplit"]["gain"], 0.5)
        self.assertEqual(result["model"]["left"]["prediction"], "A")
        self.assertEqual(result["model"]["right"]["prediction"], "B")

    def test_trace_is_ordered_and_serializable(self):
        result = DecisionTreeClassifier("entropy").fit(
            [[0], [1], [2], [3]], ["A", "A", "B", "B"], ["Feature 1"]
        ).result()
        steps = [event["step"] for event in result["trace"]["events"]]
        self.assertEqual(steps, sorted(steps))
        json.dumps(result)

    def test_rejects_malformed_data(self):
        with self.assertRaisesRegex(ValueError, "exactly one target"):
            DecisionTreeClassifier().fit([[1], [2]], ["A"], ["Feature 1"])

    def test_grows_recursively_until_max_depth(self):
        tree = DecisionTreeClassifier(max_depth=1).fit(
            [[0], [1], [2], [3]], ["A", "B", "A", "B"], ["Feature 1"]
        )
        self.assertEqual(tree.result()["model"]["left"]["kind"], "leaf")
        self.assertEqual(tree.result()["model"]["right"]["kind"], "leaf")

    def test_learns_a_default_direction_for_missing_values(self):
        features = [[1.0], [1.5], [2.0], [2.5], [4.0], [4.5], [None], [None]]
        targets = ["T", "T", "T", "T", "S", "S", "T", "S"]
        tree = DecisionTreeClassifier(max_depth=1).fit(features, targets, ["Hours"])
        split = tree.result()["bestSplit"]
        self.assertEqual(split["threshold"], 3.25)
        self.assertEqual(split["missingDirection"], "right")
        self.assertEqual(tree.predict_one([None]), "S")

    def test_feature_importance_accumulates_weighted_gain(self):
        tree = DecisionTreeClassifier(max_depth=2).fit(
            [[0, 0], [1, 0], [2, 1], [3, 1]],
            ["A", "A", "B", "B"],
            ["signal", "copy"],
        )
        importances = tree.result()["featureImportances"]
        self.assertAlmostEqual(sum(item["importance"] for item in importances), 1.0)
        self.assertEqual(importances[0]["importance"], 1.0)


if __name__ == "__main__":
    unittest.main()
