"""
Generate realistic synthetic CBC data for smartphone conjoint experiment.

Key design principles:
1. Heterogeneous preferences - different respondent segments with different priorities
2. Realistic utility structure - price sensitivity, brand premiums, feature trade-offs
3. Proper CBC design - balanced attribute levels, realistic choice patterns
4. Interesting patterns for analysis - clear brand effects, price elasticity, interactions
"""

import csv
import random
import math
from collections import Counter

# Set seed for reproducibility
random.seed(42)

# =============================================================================
# ATTRIBUTE LEVELS
# =============================================================================
BRANDS = ['iPhone', 'Samsung', 'BrandX', 'BrandY', 'BrandZ']
SCREEN_SIZES = [5.5, 6.0, 6.1, 6.5]  # inches
STORAGE = [64, 128, 256]  # GB
BATTERY_LIFE = [12, 18, 24]  # hours
CAMERA = ['Standard', 'Enhanced', 'Professional']
PRICES = [499, 599, 699, 799, 899]  # USD

# =============================================================================
# POPULATION UTILITY PARAMETERS (Part-worth utilities)
# These represent the "true" average preferences in the population
# =============================================================================

# Brand utilities (relative to BrandZ as reference = 0)
BRAND_UTILS = {
    'iPhone': 1.8,      # Strong brand premium
    'Samsung': 1.2,     # Moderate brand premium  
    'BrandX': 0.3,      # Slight positive
    'BrandY': 0.1,      # Near neutral
    'BrandZ': 0.0       # Reference level
}

# Screen size utilities (relative to 5.5" as reference)
# Larger is generally preferred but with diminishing returns
SCREEN_UTILS = {
    5.5: 0.0,
    6.0: 0.4,
    6.1: 0.5,
    6.5: 0.6
}

# Storage utilities (relative to 64GB as reference)
STORAGE_UTILS = {
    64: 0.0,
    128: 0.8,
    256: 1.2
}

# Battery life utilities (relative to 12hr as reference)
BATTERY_UTILS = {
    12: 0.0,
    18: 0.6,
    24: 1.0
}

# Camera utilities (relative to Standard as reference)
CAMERA_UTILS = {
    'Standard': 0.0,
    'Enhanced': 0.5,
    'Professional': 0.9
}

# Price coefficient (negative = higher price reduces utility)
# This is per $100, so -0.5 means each $100 increase reduces utility by 0.5
PRICE_COEF = -0.5  # per $100

# None/opt-out utility (constant)
NONE_UTILITY = -1.5  # People generally prefer to choose something

# =============================================================================
# RESPONDENT HETEROGENEITY (Random coefficients)
# Different "types" of consumers with different preference weights
# =============================================================================

SEGMENTS = {
    'brand_loyal': {
        'proportion': 0.25,
        'brand_multiplier': 1.5,      # Care more about brands
        'price_multiplier': 0.7,      # Less price sensitive
        'feature_multiplier': 0.8
    },
    'price_sensitive': {
        'proportion': 0.30,
        'brand_multiplier': 0.6,      # Care less about brands
        'price_multiplier': 1.8,      # Very price sensitive
        'feature_multiplier': 0.9
    },
    'feature_focused': {
        'proportion': 0.25,
        'brand_multiplier': 0.8,
        'price_multiplier': 0.9,
        'feature_multiplier': 1.5     # Care most about specs
    },
    'balanced': {
        'proportion': 0.20,
        'brand_multiplier': 1.0,
        'price_multiplier': 1.0,
        'feature_multiplier': 1.0
    }
}

def assign_segment():
    """Randomly assign a respondent to a segment."""
    r = random.random()
    cumulative = 0
    for seg_name, seg_props in SEGMENTS.items():
        cumulative += seg_props['proportion']
        if r <= cumulative:
            return seg_name, seg_props
    return 'balanced', SEGMENTS['balanced']

def add_individual_noise(base_value, noise_scale=0.3):
    """Add individual-level random variation."""
    return base_value + random.gauss(0, noise_scale)

def calculate_utility(alt, segment_props, individual_noise):
    """Calculate deterministic utility for an alternative."""
    if alt['brand'] == '':  # None option
        return NONE_UTILITY + random.gauss(0, 0.5)
    
    brand_mult = segment_props['brand_multiplier']
    price_mult = segment_props['price_multiplier']
    feature_mult = segment_props['feature_multiplier']
    
    utility = 0
    
    # Brand utility
    brand_util = BRAND_UTILS.get(alt['brand'], 0)
    utility += brand_util * brand_mult * (1 + individual_noise.get('brand', 0))
    
    # Screen size utility
    screen = float(alt['screen_size'])
    screen_util = SCREEN_UTILS.get(screen, 0)
    utility += screen_util * feature_mult * (1 + individual_noise.get('screen', 0))
    
    # Storage utility
    storage = int(alt['storage'])
    storage_util = STORAGE_UTILS.get(storage, 0)
    utility += storage_util * feature_mult * (1 + individual_noise.get('storage', 0))
    
    # Battery utility
    battery = int(alt['battery_life'])
    battery_util = BATTERY_UTILS.get(battery, 0)
    utility += battery_util * feature_mult * (1 + individual_noise.get('battery', 0))
    
    # Camera utility
    camera_util = CAMERA_UTILS.get(alt['camera'], 0)
    utility += camera_util * feature_mult * (1 + individual_noise.get('camera', 0))
    
    # Price utility (per $100)
    price = int(alt['price'])
    price_util = PRICE_COEF * ((price - 499) / 100)  # Relative to $499
    utility += price_util * price_mult * (1 + individual_noise.get('price', 0))
    
    return utility

def generate_choice_task():
    """Generate a single choice task with 3-4 product alternatives + None option."""
    n_products = random.choice([3, 3, 3, 4])  # Mostly 3, sometimes 4
    
    alternatives = []
    
    for i in range(n_products):
        alt = {
            'brand': random.choice(BRANDS),
            'screen_size': str(random.choice(SCREEN_SIZES)),
            'storage': str(random.choice(STORAGE)),
            'battery_life': str(random.choice(BATTERY_LIFE)),
            'camera': random.choice(CAMERA),
            'price': str(random.choice(PRICES))
        }
        alternatives.append(alt)
    
    # Add None option (with ~80% probability to keep realistic choice sets)
    if random.random() < 0.8:
        none_alt = {
            'brand': '',
            'screen_size': '',
            'storage': '',
            'battery_life': '',
            'camera': '',
            'price': ''
        }
        alternatives.append(none_alt)
    
    return alternatives

def simulate_choice(alternatives, segment_props, individual_noise):
    """Simulate choice using multinomial logit model."""
    utilities = []
    
    for alt in alternatives:
        det_utility = calculate_utility(alt, segment_props, individual_noise)
        # Add Gumbel-distributed error (Type I extreme value)
        # This gives us the logit model
        gumbel_error = -math.log(-math.log(random.random() + 1e-10))
        total_utility = det_utility + gumbel_error
        utilities.append(total_utility)
    
    # Choose the alternative with highest total utility
    chosen_idx = utilities.index(max(utilities))
    return chosen_idx

def generate_respondent_data(respondent_id, n_tasks=12):
    """Generate all choice data for one respondent."""
    # Assign segment and individual heterogeneity
    seg_name, segment_props = assign_segment()
    
    # Individual-level random coefficients (deviation from segment mean)
    individual_noise = {
        'brand': random.gauss(0, 0.2),
        'screen': random.gauss(0, 0.2),
        'storage': random.gauss(0, 0.2),
        'battery': random.gauss(0, 0.2),
        'camera': random.gauss(0, 0.2),
        'price': random.gauss(0, 0.15)
    }
    
    rows = []
    
    for task_id in range(1, n_tasks + 1):
        # Generate choice task
        alternatives = generate_choice_task()
        
        # Simulate choice
        chosen_idx = simulate_choice(alternatives, segment_props, individual_noise)
        
        # Create rows for this task
        for alt_idx, alt in enumerate(alternatives):
            alt_label = chr(65 + alt_idx) if alt['brand'] != '' else 'None'
            
            row = {
                'respondent_id': respondent_id,
                'task_id': str(task_id),
                'alternative_id': alt_label,
                'chosen': '1' if alt_idx == chosen_idx else '0',
                'brand': alt['brand'],
                'screen_size': alt['screen_size'],
                'storage': alt['storage'],
                'battery_life': alt['battery_life'],
                'camera': alt['camera'],
                'price': alt['price']
            }
            rows.append(row)
    
    return rows, seg_name

def generate_dataset(n_respondents=250, n_tasks=12):
    """Generate complete CBC dataset."""
    all_rows = []
    segment_counts = Counter()
    
    for i in range(1, n_respondents + 1):
        respondent_id = f'R{i:03d}'
        rows, segment = generate_respondent_data(respondent_id, n_tasks)
        all_rows.extend(rows)
        segment_counts[segment] += 1
        
        if i % 50 == 0:
            print(f'Generated {i}/{n_respondents} respondents...')
    
    return all_rows, segment_counts

def validate_dataset(rows):
    """Validate the generated dataset."""
    print("\n=== Dataset Validation ===")
    
    # Count basics
    respondents = set(r['respondent_id'] for r in rows)
    print(f"Total rows: {len(rows)}")
    print(f"Unique respondents: {len(respondents)}")
    
    # Tasks per respondent
    tasks_per_resp = Counter()
    for r in rows:
        tasks_per_resp[r['respondent_id']] = max(
            tasks_per_resp.get(r['respondent_id'], 0),
            int(r['task_id'])
        )
    print(f"Tasks per respondent: {Counter(tasks_per_resp.values())}")
    
    # Alternatives per task
    alts_per_task = Counter()
    for r in rows:
        key = (r['respondent_id'], r['task_id'])
        alts_per_task[key] = alts_per_task.get(key, 0) + 1
    print(f"Alternatives per task distribution: {Counter(alts_per_task.values())}")
    
    # Choice distribution
    choices = [r for r in rows if r['chosen'] == '1']
    none_choices = sum(1 for c in choices if c['brand'] == '')
    print(f"None/opt-out choices: {none_choices}/{len(choices)} ({100*none_choices/len(choices):.1f}%)")
    
    # Brand choice distribution
    brand_choices = Counter(c['brand'] for c in choices if c['brand'] != '')
    print(f"Brand choice distribution:")
    for brand, count in sorted(brand_choices.items(), key=lambda x: -x[1]):
        pct = 100 * count / sum(brand_choices.values())
        print(f"  {brand}: {count} ({pct:.1f}%)")
    
    # Price sensitivity check
    price_choices = [int(c['price']) for c in choices if c['price'] != '']
    avg_price = sum(price_choices) / len(price_choices) if price_choices else 0
    print(f"Average chosen price: ${avg_price:.0f}")

def main():
    print("Generating smartphone CBC dataset...")
    print(f"Settings: 100 respondents × 12 tasks each")
    print(f"Segments: {list(SEGMENTS.keys())}")
    
    # Generate data
    rows, segment_counts = generate_dataset(n_respondents=100, n_tasks=12)
    
    print(f"\nSegment distribution:")
    for seg, count in segment_counts.items():
        print(f"  {seg}: {count} ({100*count/100:.1f}%)")
    
    # Validate
    validate_dataset(rows)
    
    # Write to CSV
    fieldnames = ['respondent_id', 'task_id', 'alternative_id', 'chosen', 
                  'brand', 'screen_size', 'storage', 'battery_life', 'camera', 'price']
    
    output_file = 'smartphone_cbc.csv'
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n✓ Saved to {output_file}")
    
    # Also create a small version for quick testing
    small_rows = [r for r in rows if int(r['respondent_id'][1:]) <= 20]
    with open('smartphone_cbc_small.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(small_rows)
    
    print(f"✓ Saved small version (20 respondents) to smartphone_cbc_small.csv")

if __name__ == '__main__':
    main()
