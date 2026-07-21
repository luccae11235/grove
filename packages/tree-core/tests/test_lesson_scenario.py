import unittest

from grove.decision_tree import DecisionTreeClassifier
from scripts.build_lesson_data import (
    COMPLEXITY_DATASETS,
    FEATURES,
    FEATURE_NAMES,
    TARGETS,
)


class DecisionTreeLessonScenarioTests(unittest.TestCase):
    def test_greenhouse_scenario_grows_the_expected_two_split_tree(self):
        for criterion in ("gini", "entropy"):
            with self.subTest(criterion=criterion):
                result = DecisionTreeClassifier(criterion, max_depth=3).fit(
                    FEATURES, TARGETS, FEATURE_NAMES
                ).result()
                split = result["bestSplit"]
                self.assertIsNotNone(split)
                self.assertEqual(split["featureName"], "Sunlight hours")
                self.assertEqual(split["threshold"], 3.5)
                selected = [
                    event for event in result["trace"]["events"]
                    if event["type"] == "split_selected"
                ]
                self.assertEqual(len(selected), 2)
                self.assertEqual(selected[1]["nodeId"], "root.left")
                self.assertEqual(selected[1]["candidate"]["featureName"], "Water per week (L)")
                self.assertEqual(selected[1]["candidate"]["threshold"], 3.1)
                self.assertEqual(
                    DecisionTreeClassifier(criterion, max_depth=3)
                    .fit(FEATURES, TARGETS, FEATURE_NAMES)
                    .predict(FEATURES),
                    TARGETS,
                )

    def test_complexity_scenarios_are_fitted_by_the_canonical_tree(self):
        expected_split_counts = {
            "clean-cut": 1,
            "uneven-corners": 5,
            "diagonal": 6,
            "center-island": 4,
        }

        for dataset in COMPLEXITY_DATASETS:
            with self.subTest(dataset=dataset["id"]):
                tree = DecisionTreeClassifier("gini", max_depth=6).fit(
                    dataset["features"], dataset["targets"], ["x", "y"]
                )
                selected_splits = [
                    event
                    for event in tree.result()["trace"]["events"]
                    if event["type"] == "split_selected"
                ]
                self.assertEqual(
                    len(selected_splits),
                    expected_split_counts[dataset["id"]],
                )
                self.assertEqual(tree.predict(dataset["features"]), dataset["targets"])


if __name__ == "__main__":
    unittest.main()
