"""
Generate realistic CBC (Choice-Based Conjoint) datasets for teaching conjoint analysis.
Creates two scenarios: smartphone choice and streaming service choice.
"""
import random
import csv
import numpy as np
from itertools import product

random.seed(42)  # For reproducibility
np.random.seed(42)

def generate_smartphone_cbc():
    """
    Generate smartphone CBC study data.
    150 respondents, 12 tasks each, 3-4 alternatives per task.
    """
    
    # Define attribute levels
    brands = ['BrandX', 'BrandY', 'BrandZ']
    screens = [5.5, 6.0, 6.5]
    storage = [64, 128, 256]
    battery = [12, 18, 24]
    camera = ['Standard', 'Enhanced', 'Professional']
    prices = [499, 599, 699, 799, 899]
    
    # Competitor fixed profiles
    competitors = [
        {'brand': 'iPhone', 'screen': 6.1, 'storage': 128, 'battery': 18, 'camera': 'Enhanced', 'price': 799},
        {'brand': 'Samsung', 'screen': 6.5, 'storage': 256, 'battery': 24, 'camera': 'Professional', 'price': 899}
    ]
    
    # True population part-worths (we'll add heterogeneity)
    base_utilities = {
        'BrandX': 0.0,  # baseline
        'BrandY': 0.8,
        'BrandZ': -0.5,
        'screen_5.5': 0.0,  # baseline
        'screen_6.0': 0.4,
        'screen_6.5': 0.3,
        'storage_64': 0.0,  # baseline
        'storage_128': 0.6,
        'storage_256': 1.0,
        'battery_12': 0.0,  # baseline
        'battery_18': 0.5,
        'battery_24': 0.9,
        'camera_Standard': 0.0,  # baseline
        'camera_Enhanced': 0.7,
        'camera_Professional': 1.2,
        'price_coef': -0.003,  # negative sensitivity
        'ASC_None': -2.5,
        'ASC_iPhone': 1.5,
        'ASC_Samsung': 1.2
    }
    
    data = []
    
    for resp_id in range(1, 151):  # 150 respondents
        # Add individual heterogeneity
        individual_utils = {}
        for key, val in base_utilities.items():
            if key == 'price_coef':
                # Price sensitivity varies (more negative = more sensitive)
                individual_utils[key] = val + random.gauss(0, 0.0015)
            elif key.startswith('ASC_'):
                individual_utils[key] = val + random.gauss(0, 1.0)
            else:
                individual_utils[key] = val + random.gauss(0, 0.3)
        
        for task_id in range(1, 13):  # 12 tasks
            # Generate 3 experimental alternatives
            alternatives = []
            
            for alt_id in ['A', 'B', 'C']:
                alt = {
                    'respondent_id': f'R{resp_id:03d}',
                    'task_id': task_id,
                    'alternative_id': alt_id,
                    'brand': random.choice(brands),
                    'screen_size': random.choice(screens),
                    'storage': random.choice(storage),
                    'battery_life': random.choice(battery),
                    'camera': random.choice(camera),
                    'price': random.choice(prices)
                }
                alternatives.append(alt)
            
            # Sometimes include None option
            if random.random() < 0.7:
                alternatives.append({
                    'respondent_id': f'R{resp_id:03d}',
                    'task_id': task_id,
                    'alternative_id': 'None',
                    'brand': '',
                    'screen_size': '',
                    'storage': '',
                    'battery_life': '',
                    'camera': '',
                    'price': ''
                })
            
            # Sometimes include a competitor
            if random.random() < 0.3:
                comp = random.choice(competitors)
                alternatives.append({
                    'respondent_id': f'R{resp_id:03d}',
                    'task_id': task_id,
                    'alternative_id': comp['brand'],
                    'brand': comp['brand'],
                    'screen_size': comp['screen'],
                    'storage': comp['storage'],
                    'battery_life': comp['battery'],
                    'camera': comp['camera'],
                    'price': comp['price']
                })
            
            # Calculate utilities and choose
            utilities = []
            for alt in alternatives:
                if alt['alternative_id'] == 'None':
                    u = individual_utils['ASC_None']
                elif alt['alternative_id'] in ['iPhone', 'Samsung']:
                    u = individual_utils[f"ASC_{alt['alternative_id']}"]
                    u += individual_utils['price_coef'] * alt['price']
                else:
                    u = 0
                    u += individual_utils.get(f"brand_{alt['brand']}", individual_utils['BrandX'])
                    u += individual_utils.get(f"screen_{alt['screen_size']}", 0)
                    u += individual_utils.get(f"storage_{alt['storage']}", 0)
                    u += individual_utils.get(f"battery_{alt['battery_life']}", 0)
                    u += individual_utils.get(f"camera_{alt['camera']}", 0)
                    u += individual_utils['price_coef'] * alt['price']
                
                # Add Gumbel noise for choice
                u += np.random.gumbel(0, 1)
                utilities.append(u)
            
            # Choose alternative with max utility
            chosen_idx = utilities.index(max(utilities))
            
            # Add chosen flag
            for i, alt in enumerate(alternatives):
                alt['chosen'] = 1 if i == chosen_idx else 0
                data.append(alt)
    
    return data


def generate_streaming_cbc():
    """
    Generate streaming service CBC study data.
    200 respondents, 10 tasks each, 3-4 alternatives per task.
    """
    
    # Define attribute levels
    library_sizes = ['Small', 'Medium', 'Large']
    originals = ['None', 'Moderate', 'Extensive']
    ad_free = ['With_Ads', 'Ad_Free']
    streams = [1, 2, 4]
    quality = ['HD', '4K']
    prices = [5.99, 9.99, 14.99, 19.99]
    
    # Competitor fixed profiles
    competitors = [
        {'service': 'Netflix', 'library': 'Large', 'originals': 'Extensive', 'ad_free': 'Ad_Free', 
         'streams': 4, 'quality': '4K', 'price': 15.99},
        {'service': 'DisneyPlus', 'library': 'Medium', 'originals': 'Extensive', 'ad_free': 'Ad_Free',
         'streams': 4, 'quality': '4K', 'price': 10.99}
    ]
    
    # True population part-worths
    base_utilities = {
        'library_Small': 0.0,  # baseline
        'library_Medium': 0.6,
        'library_Large': 1.2,
        'originals_None': 0.0,  # baseline
        'originals_Moderate': 1.0,
        'originals_Extensive': 1.8,
        'ad_free_With_Ads': 0.0,  # baseline
        'ad_free_Ad_Free': 1.5,
        'streams_1': 0.0,  # baseline
        'streams_2': 0.5,
        'streams_4': 0.8,
        'quality_HD': 0.0,  # baseline
        'quality_4K': 0.6,
        'price_coef': -0.15,  # negative sensitivity
        'ASC_None': -1.8,
        'ASC_Netflix': 2.0,
        'ASC_DisneyPlus': 1.5
    }
    
    data = []
    
    for resp_id in range(1, 201):  # 200 respondents
        # Add individual heterogeneity
        individual_utils = {}
        for key, val in base_utilities.items():
            if key == 'price_coef':
                individual_utils[key] = val + random.gauss(0, 0.05)
            elif key.startswith('ASC_'):
                individual_utils[key] = val + random.gauss(0, 0.8)
            else:
                individual_utils[key] = val + random.gauss(0, 0.4)
        
        for task_id in range(1, 11):  # 10 tasks
            alternatives = []
            
            # Generate 3 experimental alternatives
            for alt_id in ['A', 'B', 'C']:
                alt = {
                    'respondent_id': f'S{resp_id:03d}',
                    'task_id': task_id,
                    'alternative_id': alt_id,
                    'library_size': random.choice(library_sizes),
                    'original_content': random.choice(originals),
                    'ad_experience': random.choice(ad_free),
                    'simultaneous_streams': random.choice(streams),
                    'video_quality': random.choice(quality),
                    'price': random.choice(prices)
                }
                alternatives.append(alt)
            
            # Sometimes include None option
            if random.random() < 0.8:
                alternatives.append({
                    'respondent_id': f'S{resp_id:03d}',
                    'task_id': task_id,
                    'alternative_id': 'None',
                    'library_size': '',
                    'original_content': '',
                    'ad_experience': '',
                    'simultaneous_streams': '',
                    'video_quality': '',
                    'price': ''
                })
            
            # Sometimes include a competitor
            if random.random() < 0.25:
                comp = random.choice(competitors)
                alternatives.append({
                    'respondent_id': f'S{resp_id:03d}',
                    'task_id': task_id,
                    'alternative_id': comp['service'],
                    'library_size': comp['library'],
                    'original_content': comp['originals'],
                    'ad_experience': comp['ad_free'],
                    'simultaneous_streams': comp['streams'],
                    'video_quality': comp['quality'],
                    'price': comp['price']
                })
            
            # Calculate utilities and choose
            utilities = []
            for alt in alternatives:
                if alt['alternative_id'] == 'None':
                    u = individual_utils['ASC_None']
                elif alt['alternative_id'] in ['Netflix', 'DisneyPlus']:
                    u = individual_utils[f"ASC_{alt['alternative_id']}"]
                    u += individual_utils['price_coef'] * alt['price']
                else:
                    u = 0
                    u += individual_utils.get(f"library_{alt['library_size']}", 0)
                    u += individual_utils.get(f"originals_{alt['original_content']}", 0)
                    u += individual_utils.get(f"ad_free_{alt['ad_experience']}", 0)
                    u += individual_utils.get(f"streams_{alt['simultaneous_streams']}", 0)
                    u += individual_utils.get(f"quality_{alt['video_quality']}", 0)
                    u += individual_utils['price_coef'] * alt['price']
                
                # Add Gumbel noise for choice
                u += np.random.gumbel(0, 1)
                utilities.append(u)
            
            # Choose alternative with max utility
            chosen_idx = utilities.index(max(utilities))
            
            # Add chosen flag
            for i, alt in enumerate(alternatives):
                alt['chosen'] = 1 if i == chosen_idx else 0
                data.append(alt)
    
    return data


def save_to_csv(data, filename, fieldnames):
    """Save data to CSV file."""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"✓ Saved {len(data)} rows to {filename}")


if __name__ == '__main__':
    print("Generating smartphone CBC dataset...")
    smartphone_data = generate_smartphone_cbc()
    save_to_csv(
        smartphone_data,
        'smartphone_cbc.csv',
        ['respondent_id', 'task_id', 'alternative_id', 'chosen', 'brand', 
         'screen_size', 'storage', 'battery_life', 'camera', 'price']
    )
    
    print("\nGenerating streaming service CBC dataset...")
    streaming_data = generate_streaming_cbc()
    save_to_csv(
        streaming_data,
        'streaming_service_cbc.csv',
        ['respondent_id', 'task_id', 'alternative_id', 'chosen', 'library_size',
         'original_content', 'ad_experience', 'simultaneous_streams', 'video_quality', 'price']
    )
    
    print("\n✓ All datasets generated successfully!")
    print(f"  - Smartphone: {len(smartphone_data)} observations")
    print(f"  - Streaming: {len(streaming_data)} observations")
