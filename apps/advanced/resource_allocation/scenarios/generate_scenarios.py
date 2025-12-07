import numpy as np
import csv
from pathlib import Path

def calculate_r2(x, y):
    """Calculate R² for linear fit"""
    x = np.array(x)
    y = np.array(y)
    
    # Linear regression
    A = np.vstack([x, np.ones(len(x))]).T
    m, c = np.linalg.lstsq(A, y, rcond=None)[0]
    
    # R² calculation
    y_pred = m * x + c
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = 1 - (ss_res / ss_tot)
    
    return r2

def generate_noisy_data(base_x, base_func, noise_factor=0.35, max_attempts=1000):
    """Generate data with noise ensuring R² < 0.85"""
    for attempt in range(max_attempts):
        # Calculate base y values
        y_base = [base_func(x) for x in base_x]
        
        # Add variable noise (alternate high/low to break patterns)
        y_noisy = []
        for i, y in enumerate(y_base):
            # Alternate between over and under predictions with varying amounts
            noise_pct = np.random.uniform(noise_factor * 0.6, noise_factor)
            if i % 2 == 0:
                noise = y * np.random.uniform(-noise_pct, -noise_pct * 0.3)
            else:
                noise = y * np.random.uniform(noise_pct * 0.3, noise_pct)
            
            # Occasionally add a bigger shock
            if np.random.random() < 0.25:
                noise *= 1.5
            
            y_noisy.append(max(100, y + noise))
        
        # Check R²
        r2 = calculate_r2(base_x, y_noisy)
        
        if r2 < 0.85:
            return y_noisy, r2
    
    raise ValueError(f"Could not generate data with R² < 0.85 after {max_attempts} attempts")

# SCENARIO 1: Sales Team Travel
print("Generating Sales Team Travel data...")
sales_data = []
sales_reps = [
    # (name, input_range, return_per_dollar, tier)
    ('Rep_Adams', [3200, 4800, 6400, 8000], 12, 'average'),
    ('Rep_Baker', [2500, 5000, 7500, 10000], 14, 'average'),
    ('Rep_Chen', [1800, 3600, 5400, 7200], 5, 'weak'),
    ('Rep_Davis', [4200, 7000, 9800, 12600], 32, 'star'),
    ('Rep_Evans', [3500, 5250, 7000, 8750], 11, 'average'),
    ('Rep_Foster', [2200, 4400, 6600, 8800], 13, 'average'),
    ('Rep_Garcia', [5100, 7650, 10200, 12750], 35, 'star'),
    ('Rep_Harris', [4600, 6900, 9200, 11500], 20, 'strong'),
    ('Rep_Ito', [2800, 5600, 8400, 11200], 4, 'weak'),
    ('Rep_Johnson', [5800, 8700, 11600, 14500], 38, 'star'),
    ('Rep_Kim', [2100, 4200, 6300, 8400], 12, 'average'),
    ('Rep_Lopez', [4300, 6450, 8600, 10750], 22, 'strong'),
    ('Rep_Martinez', [3800, 6650, 9500, 12350], 11, 'average'),
    ('Rep_Nelson', [2900, 4850, 6800, 8750], 19, 'strong'),
    ('Rep_Owens', [5200, 8200, 11200, 14200], 25, 'strong'),
    ('Rep_Parker', [1900, 3800, 5700, 7600], 3, 'weak'),
    ('Rep_Quinn', [4800, 7200, 9600, 12000], 36, 'star'),
    ('Rep_Roberts', [3100, 5600, 8100, 10600], 11, 'average'),
    ('Rep_Smith', [6200, 9300, 12400, 15500], 40, 'star'),
    ('Rep_Taylor', [2600, 5200, 7800, 10400], 6, 'weak')
]

for name, inputs, rate, tier in sales_reps:
    base_func = lambda x, r=rate: x * r
    outputs, r2 = generate_noisy_data(inputs, base_func)
    print(f"  {name}: R² = {r2:.3f}")
    for inp, out in zip(inputs, outputs):
        sales_data.append([name, int(inp), int(out)])

sales_file = Path(r"c:\Users\Andrew\Documents\GitHub\mktg_bivariate_tools\apps\advanced\resource_allocation\scenarios\sales_team_travel.csv")
with open(sales_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['resource_id', 'input', 'output'])
    writer.writerows(sales_data)
print(f"Saved: {sales_file}\n")

# SCENARIO 2: Social Media Influencers
print("Generating Social Media Influencers data...")
social_data = []
channels = [
    # (name, input_range, base_rate, curve_type)
    ('Instagram_Fashion', list(range(5000, 28000, 2000)), 16, 'log_saturate'),
    ('Facebook_Video', list(range(8000, 42000, 3000)), 3, 'weak_log'),
    ('TikTok_Creators', list(range(4000, 27000, 2500)), 48, 'explosive'),
    ('YouTube_Influencer', list(range(10000, 55000, 4000)), 12, 'sqrt'),
    ('LinkedIn_Sponsored', list(range(6000, 34000, 3000)), 14, 'log'),
    ('Twitter_Promoted', list(range(3000, 26000, 2500)), 10, 'log'),
    ('Podcast_Ads', list(range(12000, 49000, 4000)), 6, 'log'),
    ('Pinterest_Pins', list(range(7000, 35000, 3000)), 4, 'weak_log'),
    ('Reddit_Sponsored', list(range(5000, 34000, 3500)), 42, 'explosive'),
    ('Snapchat_Filters', list(range(9000, 41000, 3500)), 15, 'sqrt')
]

for name, inputs, rate, curve in channels:
    if curve == 'explosive':
        base_func = lambda x, r=rate: r * x
    elif curve == 'log_saturate':
        base_func = lambda x, r=rate: r * 1.2 * x**0.85
    elif curve == 'sqrt':
        base_func = lambda x, r=rate: r * np.sqrt(x) * 10
    elif curve == 'log':
        base_func = lambda x, r=rate: r * np.log(x) * 30
    else:  # weak_log
        base_func = lambda x, r=rate: r * np.log(x) * 15
    
    outputs, r2 = generate_noisy_data(inputs, base_func)
    print(f"  {name}: R² = {r2:.3f}")
    for inp, out in zip(inputs, outputs):
        social_data.append([name, int(inp), int(out)])

social_file = Path(r"c:\Users\Andrew\Documents\GitHub\mktg_bivariate_tools\apps\advanced\resource_allocation\scenarios\social_media_influencers.csv")
with open(social_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['resource_id', 'input', 'output'])
    writer.writerows(social_data)
print(f"Saved: {social_file}\n")

# SCENARIO 3: Regional Field Marketing
print("Generating Regional Field Marketing data...")
regional_data = []
regions = [
    # (name, input_range, return_rate, tier)
    ('Northeast', [15000, 20000, 25000, 30000], 18, 'major'),
    ('Southwest', [8000, 12000, 16000, 20000], 7, 'small'),
    ('Midwest', [12000, 16000, 20000, 24000], 15, 'medium'),
    ('Southeast', [6000, 10000, 14000, 18000], 28, 'mega'),
    ('Pacific', [18000, 24000, 30000, 36000], 14, 'medium'),
    ('Mountain', [5000, 8000, 11000, 14000], 6, 'small'),
    ('MidAtlantic', [14000, 19000, 24000, 29000], 30, 'mega'),
    ('NewEngland', [9000, 13000, 17000, 21000], 10, 'medium'),
    ('Gulf_Coast', [7000, 11000, 15000, 19000], 24, 'mega'),
    ('GreatLakes', [11000, 15000, 19000, 23000], 12, 'medium'),
    ('Plains', [4000, 7000, 10000, 13000], 5, 'small'),
    ('SoCal', [20000, 27000, 34000, 41000], 27, 'mega')
]

for name, inputs, rate, tier in regions:
    base_func = lambda x, r=rate: x * r
    outputs, r2 = generate_noisy_data(inputs, base_func)
    print(f"  {name}: R² = {r2:.3f}")
    for inp, out in zip(inputs, outputs):
        regional_data.append([name, int(inp), int(out)])

regional_file = Path(r"c:\Users\Andrew\Documents\GitHub\mktg_bivariate_tools\apps\advanced\resource_allocation\scenarios\regional_field_marketing.csv")
with open(regional_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['resource_id', 'input', 'output'])
    writer.writerows(regional_data)
print(f"Saved: {regional_file}\n")

# SCENARIO 4: Training Hours
print("Generating Training Hours data...")
training_data = []
reps_training = [
    # (name, hour_range, output_per_hour, tier)
    ('Rep_Anderson', [20, 30, 40, 50], 9000, 'good'),
    ('Rep_Brooks', [15, 25, 35, 45], 3000, 'low'),
    ('Rep_Carter', [25, 35, 45, 55], 7500, 'good'),
    ('Rep_Dixon', [10, 20, 30, 40], 15000, 'high'),
    ('Rep_Ellis', [30, 40, 50, 60], 8000, 'good'),
    ('Rep_Flynn', [12, 22, 32, 42], 2000, 'low'),
    ('Rep_Green', [35, 47, 59, 71], 14000, 'high'),
    ('Rep_Hughes', [18, 28, 38, 48], 6000, 'average'),
    ('Rep_Ingram', [8, 16, 24, 32], 9000, 'good'),
    ('Rep_James', [40, 52, 64, 76], 11000, 'high'),
    ('Rep_Kane', [14, 24, 34, 44], 5000, 'average'),
    ('Rep_Lee', [32, 44, 56, 68], 12000, 'high'),
    ('Rep_Moore', [22, 32, 42, 52], 6500, 'average'),
    ('Rep_Nash', [16, 26, 36, 46], 3500, 'low'),
    ('Rep_Olson', [45, 60, 75, 90], 16000, 'high'),
    ('Rep_Park', [11, 21, 31, 41], 1800, 'low'),
    ('Rep_Quinn_T', [38, 51, 64, 77], 15000, 'high'),
    ('Rep_Ross', [24, 34, 44, 54], 6000, 'average'),
    ('Rep_Stone', [28, 38, 48, 58], 10000, 'good'),
    ('Rep_Turner', [19, 29, 39, 49], 4500, 'average')
]

for name, hours, rate, tier in reps_training:
    base_func = lambda x, r=rate: x * r
    outputs, r2 = generate_noisy_data(hours, base_func)
    print(f"  {name}: R² = {r2:.3f}")
    for hr, out in zip(hours, outputs):
        training_data.append([name, int(hr), int(out)])

training_file = Path(r"c:\Users\Andrew\Documents\GitHub\mktg_bivariate_tools\apps\advanced\resource_allocation\scenarios\training_hours_quota.csv")
with open(training_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['resource_id', 'input', 'output'])
    writer.writerows(training_data)
print(f"Saved: {training_file}\n")

print("All scenarios generated with R² < 0.85 for each resource!")
