"""
Test the conjoint estimation endpoint locally.
This script sends a small sample of CBC data to the backend to verify the estimation works.
"""
import requests
import csv
import json

# Read a subset of the smartphone data
def load_sample_data(filename, max_respondents=5):
    """Load a sample of CBC data for testing."""
    data = []
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    
    # Get unique respondents
    respondents = list(set(row['respondent_id'] for row in data))[:max_respondents]
    
    # Filter to only those respondents
    sample_data = [row for row in data if row['respondent_id'] in respondents]
    
    print(f"Loaded {len(sample_data)} observations from {len(respondents)} respondents")
    return sample_data

def test_conjoint_endpoint(api_url, use_local=True):
    """Test the conjoint estimation endpoint."""
    
    # Load sample data
    print("\n1. Loading sample smartphone CBC data...")
    sample_data = load_sample_data('smartphone_cbc.csv', max_respondents=5)
    
    # Build payload
    print("\n2. Building API payload...")
    payload = {
        "data": sample_data,
        "attribute_metadata": {
            "brand": {"type": "categorical"},
            "screen_size": {"type": "numeric_linear"},
            "storage": {"type": "categorical"},
            "battery_life": {"type": "numeric_linear"},
            "camera": {"type": "categorical"},
            "price": {"type": "price"}
        },
        "none_alternative_id": "None",
        "competitor_alternative_ids": ["iPhone", "Samsung"],
        "model_options": {
            "regularization": "L2",
            "reg_strength": 1.0
        }
    }
    
    print(f"   - {len(sample_data)} observations")
    print(f"   - {len(set(r['respondent_id'] for r in sample_data))} respondents")
    print(f"   - {len(payload['attribute_metadata'])} attributes")
    
    # Send request
    print(f"\n3. Sending POST request to {api_url}...")
    try:
        response = requests.post(
            api_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"   - Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✓ SUCCESS! Estimation completed.")
            print(f"\n4. Results summary:")
            print(f"   - Respondents estimated: {len(result.get('respondents', []))}")
            print(f"   - Mean pseudo-R²: {result.get('mean_pseudo_r2', 'N/A'):.3f}")
            print(f"   - Mean tasks/respondent: {result.get('mean_tasks_per_respondent', 'N/A'):.1f}")
            print(f"   - Estimation time: {result.get('estimation_time_seconds', 'N/A'):.2f}s")
            
            # Show attribute importance
            importance = result.get('aggregate_summaries', {}).get('mean_attribute_importance', {})
            if importance:
                print(f"\n5. Attribute importance:")
                for attr, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
                    print(f"   - {attr}: {imp:.1f}%")
            
            # Show sample utilities for first respondent
            if result.get('respondents'):
                first_resp = result['respondents'][0]
                print(f"\n6. Sample coefficients for {first_resp['respondent_id']}:")
                for coef_name, coef_val in list(first_resp['coefficients'].items())[:5]:
                    print(f"   - {coef_name}: {coef_val:.4f}")
                print(f"   ... ({len(first_resp['coefficients'])} total coefficients)")
            
            # Save full result to file
            with open('test_result.json', 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n✓ Full result saved to test_result.json")
            
            return True
        else:
            print(f"\n✗ ERROR: Request failed")
            print(f"   Response: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Conjoint Analysis Endpoint Test")
    print("=" * 60)
    
    # Test options
    USE_LOCAL = True  # Set to False to test production server
    
    if USE_LOCAL:
        # Local development server
        api_url = 'http://127.0.0.1:8000/api/conjoint/estimate/'
        print("\n⚠ Testing LOCAL server - make sure Django is running:")
        print("   python manage.py runserver")
    else:
        # Production server
        api_url = 'https://drbaker-backend.onrender.com/api/conjoint/estimate/'
        print("\n⚠ Testing PRODUCTION server")
    
    print(f"\nEndpoint: {api_url}")
    
    # Run test
    success = test_conjoint_endpoint(api_url, use_local=USE_LOCAL)
    
    print("\n" + "=" * 60)
    if success:
        print("✓ Test completed successfully!")
    else:
        print("✗ Test failed. Check errors above.")
    print("=" * 60)
