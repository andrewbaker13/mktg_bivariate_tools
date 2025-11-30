# One-Way ANOVA Explorer
Interactive teaching aid for comparing two or more group means using a one-way ANOVA. Enter group summaries (mean, SD, n) for up to ten cells to:

- Run the omnibus F test against the grand mean.
- Visualize confidence bands on group means.
- Explore Tukey HSD planned comparisons via the advanced panel.

Deployed example: https://andrewbaker13.github.io/AB_ttest_tool/index.html

## Marketing scenario presets

Use the dropdown in the “Practical Scenario” section to auto-populate inputs from the `scenarios/` folder. Each scenario is a simple text file with three sections:

```
# Title
Scenario name

# Description
One or more paragraphs (blank line between paragraphs)

# Alpha
0.05   ← optional significance level for the preset

# Groups
Group name|Mean|SD|Sample size

# Planned Comparisons
Group A|Group B   ← optional Tukey pairs (one per line)

# Additional Inputs
key=value entries for future settings (leave blank to keep defaults)
```

List the available scenarios in `scenarios/scenario-index.json` (id, label, file path). Adding a new `.txt` file and referencing it in the index automatically exposes it in the UI. Presets can overwrite the descriptive copy, populate the group summary inputs, set the significance level, pre-load Tukey comparison rows, and capture additional key/value inputs for future features via the `# Additional Inputs` section (keys with blank values are ignored).
