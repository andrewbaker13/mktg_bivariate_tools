# Paired t-Test Studio
Interactive teaching aid for comparing two related measurements with a paired-samples t-test. The app lets you explore before/after campaigns, matched-market tests, or any study where observations come in linked pairs.

## What you can do
- Load narrative presets from `scenarios/` to see how analysts describe marketing lift studies. Each preset now includes a downloadable raw dataset so you can inspect the required CSV formatting.
- Choose how to enter your own data:
  1. **Paired columns** – two aligned columns (e.g., pre/post) with optional drag-and-drop CSV/TSV/TXT import.
  2. **Difference column** – a single column containing the paired differences.
  3. **Summary stats** – mean difference, SD of differences, and sample size when only summary tables are available.
- Visualize the mean difference with confidence intervals plus (when raw data exist) a histogram of the observed pairwise differences.
- Generate APA-style reporting copy, a managerial summary, and diagnostics that flag concerns about sample size, distribution of differences, or independence.

## File import expectations
- Files must include a header row naming one (difference mode) or two (paired mode) numeric columns.
- Delimiters can be commas or tabs; blank lines are ignored.
- The parser reports the first few issues (non-numeric values, missing pairs, wrong column count) so you can correct the file quickly.
- Template download buttons live next to the drop zone if you need an example CSV structure.

## Scenario presets
- `scenarios/scenario-index.json` still lists available presets. Each `.txt` scenario now supports:
  - `# Input Mode` – `paired`, `difference`, or `summary`.
  - `# Paired Columns`, `# Difference Column`, or `# Summary Stats` – the data block used to populate the UI.
  - `# Raw Data File` – relative path to the CSV/TSV that users can download.
- Adding a new preset involves dropping a `.txt` file and (optionally) a dataset in `scenarios/data/`, then updating the index. The UI reads these files at runtime, so no build step is required.

Deployed example: https://andrewbaker13.github.io/AB_ttest_tool/index.html
