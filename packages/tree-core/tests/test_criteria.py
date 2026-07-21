import unittest

from grove.criteria import entropy, gini_impurity


class ImpurityTests(unittest.TestCase):
    def test_pure_node_has_zero_impurity(self):
        self.assertEqual(gini_impurity(["A", "A", "A"]), 0.0)
        self.assertEqual(entropy(["A", "A", "A"]), 0.0)

    def test_balanced_binary_node_matches_hand_calculation(self):
        self.assertAlmostEqual(gini_impurity(["A", "A", "B", "B"]), 0.5)
        self.assertAlmostEqual(entropy(["A", "A", "B", "B"]), 1.0)


if __name__ == "__main__":
    unittest.main()
