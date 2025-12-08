import pandas as pd
import numpy as np
import random

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

# Define attributes
course_formats = ['Traditional_Lecture', 'Competitor_FlippedClassroom', 'Competitor_ProjectBased', 'Competitor_HybridOnline']
weekly_hours = [2.5, 3.5, 4.5, 5.5, 6.5, 8.0]
assessment_styles = ['Exams', 'Projects', 'Mixed', 'CaseStudies']

# Parameters
n_respondents = 50
n_tasks = 30
n_alternatives = 4  # 3 competitors + 1 traditional (+ None)

# Generate heterogeneous preference parameters for respondents
respondent_params = []
for i in range(n_respondents):
    # Create diverse preference profiles
    segment = i % 4  # 4 segments
    
    if segment == 0:  # Traditional learners - prefer lectures, less time
        params = {
            'course_format': {'Traditional_Lecture': 0, 'Competitor_FlippedClassroom': -0.5, 
                             'Competitor_ProjectBased': -0.8, 'Competitor_HybridOnline': -0.3},
            'weekly_hours': -0.15,  # Negative - prefer less time
            'assessment_style': {'Exams': 0, 'Projects': -0.4, 'Mixed': -0.1, 'CaseStudies': -0.3},
            'asc_none': -1.5  # Don't want to skip
        }
    elif segment == 1:  # Project-based learners - willing to invest time
        params = {
            'course_format': {'Traditional_Lecture': -0.6, 'Competitor_FlippedClassroom': 0.2, 
                             'Competitor_ProjectBased': 0.8, 'Competitor_HybridOnline': 0.1},
            'weekly_hours': -0.05,  # Less sensitive to time
            'assessment_style': {'Exams': -0.6, 'Projects': 0.6, 'Mixed': 0.2, 'CaseStudies': 0.4},
            'asc_none': -2.0
        }
    elif segment == 2:  # Flexible/online preference
        params = {
            'course_format': {'Traditional_Lecture': -0.5, 'Competitor_FlippedClassroom': 0.4, 
                             'Competitor_ProjectBased': -0.2, 'Competitor_HybridOnline': 0.7},
            'weekly_hours': -0.10,
            'assessment_style': {'Exams': -0.2, 'Projects': 0.2, 'Mixed': 0.3, 'CaseStudies': 0.1},
            'asc_none': -1.2
        }
    else:  # Time-constrained - prefer efficient formats
        params = {
            'course_format': {'Traditional_Lecture': -0.3, 'Competitor_FlippedClassroom': 0.5, 
                             'Competitor_ProjectBased': -0.4, 'Competitor_HybridOnline': 0.3},
            'weekly_hours': -0.20,  # Very time-sensitive
            'assessment_style': {'Exams': 0.3, 'Projects': -0.2, 'Mixed': 0.1, 'CaseStudies': -0.1},
            'asc_none': -0.8  # More willing to skip
        }
    
    # Add individual-level noise
    for key in params:
        if isinstance(params[key], dict):
            for subkey in params[key]:
                params[key][subkey] += np.random.normal(0, 0.2)
        else:
            params[key] += np.random.normal(0, 0.05)
    
    respondent_params.append(params)

# Generate CBC data
data = []

for resp_idx in range(n_respondents):
    resp_id = f'S{str(resp_idx + 1).zfill(3)}'
    params = respondent_params[resp_idx]
    
    for task_idx in range(n_tasks):
        task_id = task_idx + 1
        
        # Generate alternatives for this task
        alternatives = []
        
        # 4 regular alternatives (including competitors)
        for alt_idx in range(n_alternatives):
            alt_id = chr(65 + alt_idx)  # A, B, C, D
            
            course_format = random.choice(course_formats)
            hours = random.choice(weekly_hours)
            assessment = random.choice(assessment_styles)
            
            # Compute utility
            utility = 0.0
            utility += params['course_format'][course_format]
            utility += params['weekly_hours'] * hours
            utility += params['assessment_style'][assessment]
            utility += np.random.gumbel(0, 1)  # Error term
            
            alternatives.append({
                'alternative_id': alt_id,
                'course_format': course_format,
                'weekly_hours': hours,
                'assessment_style': assessment,
                'utility': utility
            })
        
        # None alternative
        none_utility = params['asc_none'] + np.random.gumbel(0, 1)
        alternatives.append({
            'alternative_id': 'None',
            'course_format': '',
            'weekly_hours': '',
            'assessment_style': '',
            'utility': none_utility
        })
        
        # Determine choice (max utility)
        chosen_idx = max(range(len(alternatives)), key=lambda i: alternatives[i]['utility'])
        
        # Add to dataset
        for idx, alt in enumerate(alternatives):
            data.append({
                'respondent_id': resp_id,
                'task_id': task_id,
                'alternative_id': alt['alternative_id'],
                'chosen': 1 if idx == chosen_idx else 0,
                'course_format': alt['course_format'],
                'weekly_hours': alt['weekly_hours'],
                'assessment_style': alt['assessment_style']
            })

# Create DataFrame
df = pd.DataFrame(data)

# Save to CSV
df.to_csv('course_design_cbc.csv', index=False)

print(f'Generated Marketing Research Course CBC dataset:')
print(f'  - Total rows: {len(df)}')
print(f'  - Respondents: {df["respondent_id"].nunique()}')
print(f'  - Tasks per respondent: {df.groupby("respondent_id")["task_id"].nunique().mean():.1f}')
print(f'  - Alternatives per task: {df.groupby(["respondent_id", "task_id"])["alternative_id"].count().mean():.1f}')
print(f'  - None choices: {df[df["alternative_id"] == "None"]["chosen"].sum()} ({df[df["alternative_id"] == "None"]["chosen"].sum() / n_respondents / n_tasks * 100:.1f}%)')
print(f'  - Saved to: course_design_cbc.csv')

# Display sample
print('\nSample rows:')
print(df.head(15))
