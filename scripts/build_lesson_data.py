"""Generate browser-ready lesson data by executing Grove's Python model."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "packages" / "tree-core"
sys.path.insert(0, str(CORE))

from grove.decision_tree import DecisionTreeClassifier  # noqa: E402

FEATURES = [
    [1.0, 1.4], [1.4, 2.7], [2.0, 1.9], [2.5, 3.5], [3.2, 2.4],
    [3.8, 4.2], [4.3, 1.5], [4.9, 3.1], [5.5, 2.0], [6.1, 3.9],
]
TARGETS = [
    "Thriving", "Thriving", "Thriving", "Struggling", "Thriving",
    "Struggling", "Struggling", "Struggling", "Struggling", "Struggling",
]
FEATURE_NAMES = ["Sunlight hours", "Water per week (L)"]
ROW_IDS = list("ABCDEFGHIJ")

MISSING_FEATURES = [[1.0], [1.5], [2.0], [2.5], [4.0], [4.5], [None], [None]]
MISSING_TARGETS = [
    "Thriving", "Thriving", "Thriving", "Thriving",
    "Struggling", "Struggling", "Thriving", "Struggling",
]
MISSING_FEATURE_NAMES = ["Sunlight hours"]
MISSING_ROW_IDS = list("KLMNOPQR")

MULTI_FEATURE_FEATURES = [
    [3.9, 3.0, 14], [4.2, 3.1, 16], [5.0, 3.6, 15], [3.2, 2.8, 17],
    [4.5, 1.0, 23], [4.6, 1.4, 26], [2.0, 2.2, 27], [1.5, 3.3, 22],
    [3.5, 2.6, 21], [4.0, 2.9, 24], [4.8, 3.4, 20], [5.5, 4.0, 25],
]
MULTI_FEATURE_TARGETS = ["Struggling"] * 8 + ["Thriving"] * 4
MULTI_FEATURE_NAMES = ["Sunlight hours", "Water per week (L)", "Temperature (°C)"]
MULTI_FEATURE_ROW_IDS = [str(index + 1) for index in range(len(MULTI_FEATURE_FEATURES))]

COMPLEXITY_DATASETS = [
    {
        "id": "clean-cut",
        "features": [
            [1.0, 1.2], [1.2, 2.5], [1.5, 4.0], [2.0, 3.2], [2.2, 5.2], [2.5, 6.4],
            [5.1, 1.0], [5.4, 2.4], [5.7, 3.8], [6.1, 5.0], [6.5, 6.2], [6.8, 4.1],
        ],
        "targets": ["Class A"] * 6 + ["Class B"] * 6,
    },
    {
        "id": "uneven-corners",
        "features": [
            [1.0, 1.0], [1.5, 1.2], [2.0, 1.4], [2.5, 1.6], [1.3, 2.2], [2.2, 2.6],
            [1.4, 5.0], [2.4, 6.0],
            [5.0, 1.0], [5.6, 1.5], [6.2, 2.0], [6.8, 2.7],
            [5.1, 5.0], [5.7, 5.5], [6.3, 6.0], [6.9, 6.6],
        ],
        "targets": ["Class A"] * 6 + ["Class B"] * 6 + ["Class A"] * 4,
    },
    {
        "id": "diagonal",
        "features": [
            [x + 0.06 * (y % 2), y + 0.05 * (x % 3)]
            for y in range(1, 7)
            for x in range(1, 7)
        ],
        "targets": [
            "Class A" if x + y <= 7 else "Class B"
            for y in range(1, 7)
            for x in range(1, 7)
        ],
    },
    {
        "id": "center-island",
        "features": [
            [x + 0.06 * (y % 2), y + 0.05 * (x % 3)]
            for y in range(1, 7)
            for x in range(1, 7)
        ],
        "targets": [
            "Class A" if 3 <= x <= 4 and 3 <= y <= 4 else "Class B"
            for y in range(1, 7)
            for x in range(1, 7)
        ],
    },
]


def lesson_excerpt() -> str:
    source = (CORE / "grove" / "decision_tree.py").read_text()
    return source.split("    # lesson:start\n", 1)[1].split("    # lesson:end", 1)[0].rstrip()


def main() -> None:
    scenarios = {}
    for criterion in ("gini", "entropy"):
        scenarios[criterion] = DecisionTreeClassifier(criterion, max_depth=3).fit(
            FEATURES, TARGETS, FEATURE_NAMES
        ).result()

    missing_scenario = DecisionTreeClassifier("gini", max_depth=1).fit(
        MISSING_FEATURES, MISSING_TARGETS, MISSING_FEATURE_NAMES
    ).result()

    multi_feature_scenario = DecisionTreeClassifier("gini", max_depth=3).fit(
        MULTI_FEATURE_FEATURES, MULTI_FEATURE_TARGETS, MULTI_FEATURE_NAMES
    ).result()

    complexity_datasets = []
    for dataset in COMPLEXITY_DATASETS:
        complexity_scenario = DecisionTreeClassifier(
            "gini", max_depth=6
        ).fit(dataset["features"], dataset["targets"], ["x", "y"]).result()
        complexity_datasets.append({
            "id": dataset["id"],
            "dataset": {
                "rowIds": [str(index + 1) for index in range(len(dataset["features"]))],
                "features": dataset["features"],
                "targets": dataset["targets"],
                "featureNames": ["x", "y"],
            },
            "scenario": complexity_scenario,
        })

    payload = {
        "dataset": {
            "rowIds": ROW_IDS,
            "features": FEATURES,
            "targets": TARGETS,
            "featureNames": FEATURE_NAMES,
        },
        "scenarios": scenarios,
        "missingDataset": {
            "rowIds": MISSING_ROW_IDS,
            "features": MISSING_FEATURES,
            "targets": MISSING_TARGETS,
            "featureNames": MISSING_FEATURE_NAMES,
        },
        "missingScenario": missing_scenario,
        "multiFeatureDataset": {
            "rowIds": MULTI_FEATURE_ROW_IDS,
            "features": MULTI_FEATURE_FEATURES,
            "targets": MULTI_FEATURE_TARGETS,
            "featureNames": MULTI_FEATURE_NAMES,
        },
        "multiFeatureScenario": multi_feature_scenario,
        "complexityDatasets": complexity_datasets,
        "source": lesson_excerpt(),
        "sourcePath": "packages/tree-core/grove/decision_tree.py",
    }
    output = ROOT / "packages" / "tree-visuals" / "src" / "generated" / "firstSplitLesson.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Generated {output.relative_to(ROOT)} from the Python tree core")


if __name__ == "__main__":
    main()
