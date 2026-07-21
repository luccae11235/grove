"""Impurity measures used by classification trees.

The implementation intentionally uses only the Python standard library so a
learner can inspect every calculation. NumPy can be introduced later for speed
without changing the public model or training trace.
"""

from __future__ import annotations

from collections import Counter
from math import log2
from typing import Sequence, Union

Label = Union[str, int, float]


def _probabilities(labels: Sequence[Label]) -> list[float]:
    if not labels:
        return []
    counts = Counter(labels)
    return [count / len(labels) for count in counts.values()]


def gini_impurity(labels: Sequence[Label]) -> float:
    """Return the probability of misclassification under the node mixture."""
    return 1.0 - sum(p**2 for p in _probabilities(labels)) if labels else 0.0


def entropy(labels: Sequence[Label]) -> float:
    """Return Shannon entropy in bits."""
    return -sum(p * log2(p) for p in _probabilities(labels))


def impurity(labels: Sequence[Label], criterion: str) -> float:
    if criterion == "gini":
        return gini_impurity(labels)
    if criterion == "entropy":
        return entropy(labels)
    raise ValueError("criterion must be 'gini' or 'entropy'")
