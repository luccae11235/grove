"""A small, inspectable classification tree used by Grove itself.

The implementation favors visible state over speed. Training emits a serializable
trace so the article, calculations, tests, and visualizations all describe the
same candidates and the same learned tree.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from math import isnan
from typing import Sequence, Union

from .criteria import Label, impurity

EPSILON = 1e-12
FeatureValue = Union[float, int, None]


@dataclass(frozen=True)
class Dataset:
    features: list[list[FeatureValue]]
    targets: list[Label]
    feature_names: list[str]


def _is_missing(value: FeatureValue) -> bool:
    return value is None or (isinstance(value, float) and isnan(value))


def _distribution(labels: Sequence[Label]) -> list[dict]:
    counts = Counter(labels)
    return [
        {"label": label, "count": count, "probability": count / len(labels)}
        for label, count in sorted(counts.items(), key=lambda item: str(item[0]))
    ]


def _prediction(labels: Sequence[Label]) -> Label:
    counts = Counter(labels)
    return min(counts, key=lambda label: (-counts[label], str(label)))


def _candidate_thresholds(values: Sequence[FeatureValue]) -> list[float]:
    unique = sorted({float(value) for value in values if not _is_missing(value)})
    return [(left + right) / 2 for left, right in zip(unique, unique[1:])]


class DecisionTreeClassifier:
    """Train a deterministic numeric classification tree and expose its reasoning."""

    def __init__(
        self,
        criterion: str = "gini",
        max_depth: int = 3,
        min_samples_split: int = 2,
        min_samples_leaf: int = 1,
        min_impurity_decrease: float = 0.0,
    ):
        if criterion not in {"gini", "entropy"}:
            raise ValueError("criterion must be 'gini' or 'entropy'")
        if not isinstance(max_depth, int) or max_depth < 0:
            raise ValueError("max_depth must be a non-negative integer")
        if not isinstance(min_samples_split, int) or min_samples_split < 2:
            raise ValueError("min_samples_split must be an integer of at least 2")
        if not isinstance(min_samples_leaf, int) or min_samples_leaf < 1:
            raise ValueError("min_samples_leaf must be a positive integer")
        if min_impurity_decrease < 0:
            raise ValueError("min_impurity_decrease cannot be negative")

        self.criterion = criterion
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.min_impurity_decrease = min_impurity_decrease
        self.model: dict | None = None
        self.best_split: dict | None = None
        self.trace: dict | None = None
        self.feature_importances_: list[dict] = []
        self.importance_contributions_: list[dict] = []
        self._dataset: Dataset | None = None
        self._step = 0

    def _event(self, events: list[dict], event_type: str, **payload: object) -> None:
        events.append({"type": event_type, "step": self._step, **payload})
        self._step += 1

    # lesson:start
    def fit(
        self,
        features: list[list[FeatureValue]],
        targets: list[Label],
        feature_names: list[str],
    ) -> "DecisionTreeClassifier":
        """Grow a tree by repeatedly keeping the candidate with largest gain."""
        dataset = Dataset(features, targets, feature_names)
        self._validate(dataset)
        self._dataset = dataset
        self._step = 0
        self.importance_contributions_ = []

        events: list[dict] = []
        self._event(
            events,
            "training_started",
            criterion=self.criterion,
            sampleCount=len(targets),
            maxDepth=self.max_depth,
        )
        self.model = self._grow(dataset, list(range(len(targets))), 0, "root", events)

        root_splits = [
            event["candidate"]
            for event in events
            if event["type"] == "split_selected" and event["nodeId"] == "root"
        ]
        self.best_split = root_splits[0] if root_splits else None
        self.feature_importances_ = self._feature_importances(dataset)
        self._event(events, "training_completed", nodeId="root")
        self.trace = {"version": "2.0", "criterion": self.criterion, "events": events}
        return self

    def _grow(
        self,
        dataset: Dataset,
        indices: list[int],
        depth: int,
        node_id: str,
        events: list[dict],
    ) -> dict:
        labels = [dataset.targets[index] for index in indices]
        node_impurity = impurity(labels, self.criterion)
        self._event(
            events,
            "node_started",
            nodeId=node_id,
            depth=depth,
            sampleIndices=indices,
            impurity=node_impurity,
        )

        stop_reason = self._stop_reason(indices, labels, depth)
        if stop_reason:
            return self._make_leaf(dataset, indices, depth, node_id, stop_reason, events)

        best = self._find_best_split(dataset, indices, depth, node_id, node_impurity, events)
        if best is None or best["gain"] <= self.min_impurity_decrease + EPSILON:
            return self._make_leaf(dataset, indices, depth, node_id, "no_gain", events)

        weighted_contribution = len(indices) / len(dataset.targets) * best["gain"]
        contribution = {
            "nodeId": node_id,
            "depth": depth,
            "featureIndex": best["featureIndex"],
            "featureName": best["featureName"],
            "gain": best["gain"],
            "sampleFraction": len(indices) / len(dataset.targets),
            "weightedContribution": weighted_contribution,
        }
        self.importance_contributions_.append(contribution)
        self._event(events, "split_selected", nodeId=node_id, depth=depth, candidate=best)

        left = self._grow(dataset, best["leftIndices"], depth + 1, f"{node_id}.left", events)
        right = self._grow(dataset, best["rightIndices"], depth + 1, f"{node_id}.right", events)
        return {
            "kind": "split",
            "id": node_id,
            "depth": depth,
            "featureIndex": best["featureIndex"],
            "featureName": best["featureName"],
            "threshold": best["threshold"],
            "missingDirection": best["missingDirection"],
            "prediction": _prediction(labels),
            "impurity": node_impurity,
            "gain": best["gain"],
            "sampleCount": len(indices),
            "sampleIndices": indices,
            "distribution": _distribution(labels),
            "left": left,
            "right": right,
        }

    def _find_best_split(
        self,
        dataset: Dataset,
        indices: list[int],
        depth: int,
        node_id: str,
        parent_impurity: float,
        events: list[dict],
    ) -> dict | None:
        best: dict | None = None

        for feature_index, feature_name in enumerate(dataset.feature_names):
            node_values = [dataset.features[index][feature_index] for index in indices]
            missing = [index for index in indices if _is_missing(dataset.features[index][feature_index])]
            observed = [index for index in indices if index not in missing]

            for threshold in _candidate_thresholds(node_values):
                left_observed = [
                    index
                    for index in observed
                    if float(dataset.features[index][feature_index]) <= threshold
                ]
                right_observed = [index for index in observed if index not in left_observed]

                if missing:
                    directions = ("left", "right")
                else:
                    directions = ("left" if len(left_observed) >= len(right_observed) else "right",)

                for missing_direction in directions:
                    left = left_observed + (missing if missing_direction == "left" else [])
                    right = right_observed + (missing if missing_direction == "right" else [])
                    if min(len(left), len(right)) < self.min_samples_leaf:
                        continue

                    left_impurity = impurity([dataset.targets[index] for index in left], self.criterion)
                    right_impurity = impurity([dataset.targets[index] for index in right], self.criterion)
                    weighted = (
                        len(left) / len(indices) * left_impurity
                        + len(right) / len(indices) * right_impurity
                    )
                    candidate = {
                        "nodeId": node_id,
                        "depth": depth,
                        "featureIndex": feature_index,
                        "featureName": feature_name,
                        "threshold": threshold,
                        "parentImpurity": parent_impurity,
                        "leftImpurity": left_impurity,
                        "rightImpurity": right_impurity,
                        "weightedImpurity": weighted,
                        "gain": parent_impurity - weighted,
                        "missingDirection": missing_direction,
                        "missingIndices": missing,
                        "leftIndices": left,
                        "rightIndices": right,
                    }
                    self._event(
                        events,
                        "candidate_evaluated",
                        nodeId=node_id,
                        depth=depth,
                        candidate=candidate,
                    )

                    if best is None or candidate["gain"] > best["gain"] + EPSILON:
                        best = candidate

        return best

    def predict_one(self, features: Sequence[FeatureValue]) -> Label:
        """Route one row through learned thresholds until it reaches a leaf."""
        if self.model is None or self._dataset is None:
            raise RuntimeError("Call fit before predicting")
        if len(features) != len(self._dataset.feature_names):
            raise ValueError("Prediction row must match the training width")

        node = self.model
        while node["kind"] == "split":
            value = features[node["featureIndex"]]
            if _is_missing(value):
                direction = node["missingDirection"]
            else:
                direction = "left" if float(value) <= node["threshold"] else "right"
            node = node[direction]
        return node["prediction"]

    def predict(self, features: Sequence[Sequence[FeatureValue]]) -> list[Label]:
        return [self.predict_one(row) for row in features]
    # lesson:end

    def _stop_reason(self, indices: list[int], labels: list[Label], depth: int) -> str | None:
        if impurity(labels, self.criterion) <= EPSILON:
            return "pure"
        if depth >= self.max_depth:
            return "max_depth"
        if len(indices) < self.min_samples_split:
            return "min_samples_split"
        return None

    def _make_leaf(
        self,
        dataset: Dataset,
        indices: list[int],
        depth: int,
        node_id: str,
        reason: str,
        events: list[dict],
    ) -> dict:
        labels = [dataset.targets[index] for index in indices]
        leaf = {
            "kind": "leaf",
            "id": node_id,
            "depth": depth,
            "prediction": _prediction(labels),
            "impurity": impurity(labels, self.criterion),
            "sampleCount": len(indices),
            "sampleIndices": indices,
            "distribution": _distribution(labels),
            "stopReason": reason,
        }
        self._event(events, "leaf_created", nodeId=node_id, depth=depth, reason=reason, leaf=leaf)
        return leaf

    def _feature_importances(self, dataset: Dataset) -> list[dict]:
        raw = [0.0 for _ in dataset.feature_names]
        for contribution in self.importance_contributions_:
            raw[contribution["featureIndex"]] += contribution["weightedContribution"]
        total = sum(raw)
        return [
            {
                "featureIndex": index,
                "featureName": name,
                "rawImportance": value,
                "importance": value / total if total > EPSILON else 0.0,
            }
            for index, (name, value) in enumerate(zip(dataset.feature_names, raw))
        ]

    def result(self) -> dict:
        if self.model is None or self.trace is None:
            raise RuntimeError("Call fit before requesting the result")
        return {
            "model": self.model,
            "bestSplit": self.best_split,
            "featureImportances": self.feature_importances_,
            "importanceContributions": self.importance_contributions_,
            "trace": self.trace,
        }

    @staticmethod
    def _validate(dataset: Dataset) -> None:
        if len(dataset.features) < 2:
            raise ValueError("A decision split needs at least two samples")
        if len(dataset.features) != len(dataset.targets):
            raise ValueError("Every feature row must have exactly one target")
        width = len(dataset.features[0]) if dataset.features else 0
        if width == 0 or len(dataset.feature_names) != width:
            raise ValueError("Feature names must match the dataset width")
        if any(len(row) != width for row in dataset.features):
            raise ValueError("Features must be a rectangular matrix")
        valid_values = (int, float)
        if any(
            value is not None and not isinstance(value, valid_values)
            for row in dataset.features
            for value in row
        ):
            raise ValueError("Features must contain only numbers or missing values")
