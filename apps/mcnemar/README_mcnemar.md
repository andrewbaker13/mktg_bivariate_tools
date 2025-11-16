# McNemar Test Explorer
Interactive teaching aid for paired, binary outcomes. Load a 2×2 contingency table describing how the same audience responded on Variant A vs Variant B (or before vs after) to:

- Run McNemar’s test via continuity-corrected chi-square, the uncorrected chi-square, or the exact binomial approach.
- Visualize the contingency matrix and spotlight the one-sided wins (“switchers”) that power the test.
- Auto-generate APA-ready reporting language plus a managerial narrative that highlights direction, magnitude, and risk.

Deployed example: (coming soon)

## Scenario presets

Use the dropdown in the “Practical Scenario” section to populate the matched table from files stored inside `scenarios/`. Each preset is a lightweight text file composed of the following sections:

```
# Title
Scenario name

# Description
One or more paragraphs (blank line between paragraphs)

# Alpha
0.05    ← optional significance level

# Counts
a_yes_b_yes=135
a_yes_b_no=22
a_no_b_yes=41
a_no_b_no=302

# Labels
condition_a=Legacy nurture controller
condition_b=Insight-driven controller
positive_label=Conversion
negative_label=No conversion

# Additional Inputs
analysis_method=exact   ← optional settings to toggle defaults
```

The `# Counts` block is required and encodes the four cells of the 2×2 table using a consistent naming convention (`a_yes_b_yes`, `a_yes_b_no`, `a_no_b_yes`, `a_no_b_no`). The optional `# Labels` block lets a preset customize the condition and outcome names. Additional key/value pairs (for example, the preferred analysis method) live inside `# Additional Inputs`.

List the available scenarios in `scenarios/scenario-index.json` (id, label, file path). Adding a new `.txt` file and referencing it in the index automatically exposes it in the UI.
