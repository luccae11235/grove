# Grove Tree Core

Readable decision-tree learning algorithms written from scratch in Python. The
package implements impurity criteria, deterministic split search, recursive tree
construction, missing-value routing, feature importance, prediction, and an
inspectable training trace without a machine-learning dependency.

[Read the canonical interactive article]({{CANONICAL_ARTICLE_URL}}).

## Run the tests

Python 3.9 or newer is the only runtime requirement.

```bash
python3 -m unittest discover -s tests -v
```

## Use the package

```python
from grove import DecisionTreeClassifier

model = DecisionTreeClassifier(max_depth=3)
model.fit(
    [[1.0], [2.0], [8.0], [9.0]],
    ["young", "young", "mature", "mature"],
    ["measurement"],
)

print(model.predict([[1.5], [8.5]]))
print(model.model)
```

The implementation favors explicit, inspectable steps over production-scale
optimization. It is intended for learning, visual explanation, and small
experiments—not as a replacement for a hardened ML library.

## License

The source code is available under the MIT License.
