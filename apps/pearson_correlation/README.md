# Pearson Correlation Studio
Interactive teaching aid for exploring the linear relationship between two paired metrics. The app is useful for marketing mix diagnostics, survey KPI comparisons, or any analysis where each observation has aligned X/Y values.

## What you can do
- Load narrative presets from `scenarios/` to see how analysts describe real-world marketing relationships. Each preset can expose its underlying CSV so you can inspect the formatting.
- Choose how to enter your own data:
  1. **Paired columns** – drag-and-drop CSV/TSV/TXT files that contain two aligned numeric columns (X and Y).
  2. **Manual entry** – enter smaller datasets directly into an editable table.
  3. **Correlation matrix upload** – provide a wide file (two or more numeric columns) to generate a full matrix, scatter matrix, and per-variable stats.
- Visualize the estimated correlation with its confidence interval plus a scatterplot and least-squares line for the raw pairs.
- When multiple variables are supplied, inspect the correlation heatmap plus the scatter dropdown (with per-pair confidence intervals) along with each variable's mean and SD.
- Generate APA-style wording, a managerial-ready summary, and diagnostics that call out sample size limitations, leverage points, and lack of spread.

## File import expectations
- Files must include a header row naming two numeric columns (e.g., `x,y` or `spend,conversions`).
- Delimiters can be commas or tabs; blank lines are ignored.
- The parser surfaces the first few issues (non-numeric values, missing pairs, wrong column count) so you can correct the file quickly.
- Template download buttons live next to the drop zone if you need an example CSV structure.

## Scenario presets
- `scenarios/scenario-index.json` lists available presets. Each `.txt` scenario supports:
  - `# Input Mode` – use `paired` for two-column presets or `matrix` for multi-column uploads.
  - `# Paired Columns` – the CSV-style data block used to populate the UI (matrix presets may include more than two columns).
- `# Raw Data File` – relative path to the CSV/TSV that users can download.
- Adding a new preset involves dropping a `.txt` file and (optionally) a dataset in `scenarios/data/`, then updating the index. The UI reads these files at runtime, so no build step is required.

Deployed example: https://andrewbaker13.github.io/AB_ttest_tool/index.html
