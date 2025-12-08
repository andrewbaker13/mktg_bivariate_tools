import pandas as pd

# Read the full dataset
df = pd.read_csv('smartphone_cbc.csv')

# Get first 20 respondents
respondent_ids = [f'R{str(i).zfill(3)}' for i in range(1, 21)]
small = df[df['respondent_id'].isin(respondent_ids)]

# Save to new file
small.to_csv('smartphone_cbc_small.csv', index=False)

print(f'Created small dataset:')
print(f'  - Total rows: {len(small)}')
print(f'  - Respondents: {small["respondent_id"].nunique()}')
print(f'  - Tasks per respondent: {small.groupby("respondent_id")["task_id"].nunique().mean():.1f}')
print(f'  - Saved to: smartphone_cbc_small.csv')
