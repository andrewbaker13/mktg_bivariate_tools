# Dashboard Improvements Implementation Guide

## ✅ Backend Complete (Deployed to Production)

All 7 new endpoints are live:

### Student Endpoints
- `GET /api/analytics/my-badges/` - Achievement badges with progress tracking
- `GET /api/analytics/my-percentile/` - Peer ranking within course

### Instructor Endpoints
- `GET /api/analytics/course/{id}/at-risk/` - At-risk student detection
- `GET /api/analytics/course/{id}/heatmap/` - Activity patterns by hour/day
- `GET /api/analytics/student/{id}/` - Individual student drill-down

## Frontend Updates Needed

### Student Dashboard (`student-dashboard.html`)

#### 1. Add Badges Section (After line 175)
```html
<!-- Achievements Section -->
<div class="chart-container">
    <h3>🏆 Your Achievements</h3>
    <div id="badges-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;"></div>
    <div id="next-milestones" style="margin-top: 1.5rem;"></div>
</div>
```

#### 2. Add Peer Comparison Section
```html
<!-- Peer Comparison -->
<div class="chart-container" id="peer-comparison" style="display: none;">
    <h3>📊 How You Compare to Classmates</h3>
    <div id="percentile-details"></div>
</div>
```

#### 3. Add Badge CSS Styles
```css
.badge-item {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
}
.badge-item.gold { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.badge-item.silver { background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%); }
.badge-item.bronze { background: linear-gradient(135deg, #d97706 0%, #92400e 100%); }
.badge-icon { font-size: 3rem; }
.badge-name { font-weight: 700; margin: 0.5rem 0; }
.milestone-progress { background: #e5e7eb; height: 10px; border-radius: 5px; margin-top: 0.5rem; }
.milestone-fill { background: #3b82f6; height: 100%; border-radius: 5px; transition: width 0.3s; }
```

#### 4. Update JavaScript to Load Badges
```javascript
// In loadDashboard() function, add parallel fetch:
const badges = await fetch(`${API_BASE}/analytics/my-badges/`, {
    headers: { 'Authorization': `Token ${token}` }
}).then(r => r.json());

const percentile = await fetch(`${API_BASE}/analytics/my-percentile/`, {
    headers: { 'Authorization': `Token ${token}` }
}).then(r => r.json()).catch(() => ({ enrolled: false }));

// Display badges
displayBadges(badges);
displayPercentile(percentile);
```

#### 5. Add Display Functions
```javascript
function displayBadges(badges) {
    const container = document.getElementById('badges-container');
    const milestonesContainer = document.getElementById('next-milestones');
    
    document.getElementById('badges-earned').textContent = badges.total_badges;
    
    container.innerHTML = badges.badges.map(badge => `
        <div class="badge-item ${badge.tier}">
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">${badge.description}</div>
        </div>
    `).join('');
    
    if (badges.next_milestones.length > 0) {
        milestonesContainer.innerHTML = `
            <h4>Next Achievements:</h4>
            ${badges.next_milestones.map(m => `
                <div style="margin: 1rem 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>${m.badge}</span>
                        <span>${m.current}/${m.target}</span>
                    </div>
                    <div class="milestone-progress">
                        <div class="milestone-fill" style="width: ${m.progress}%"></div>
                    </div>
                </div>
            `).join('')}
        `;
    }
}

function displayPercentile(percentile) {
    if (!percentile.enrolled) return;
    
    document.getElementById('percentile-rank').textContent = `${percentile.rank_category.icon} Top ${100 - percentile.percentiles.average}%`;
    
    const peerSection = document.getElementById('peer-comparison');
    peerSection.style.display = 'block';
    
    document.getElementById('percentile-details').innerHTML = `
        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Your Rank</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #1f2937;">
                        ${percentile.rank_category.icon} ${percentile.rank_category.label}
                    </div>
                    <div style="font-size: 0.875rem; color: #6b7280;">In ${percentile.course}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Tool Runs Percentile</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">${percentile.percentiles.total_runs}%</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">${percentile.your_stats.total_runs} runs (avg: ${percentile.course_averages.total_runs})</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Tools Explored Percentile</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #10b981;">${percentile.percentiles.unique_tools}%</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">${percentile.your_stats.unique_tools} tools (avg: ${percentile.course_averages.unique_tools})</div>
                </div>
            </div>
        </div>
    `;
}
```

---

### Instructor Dashboard (`instructor-analytics.html`)

#### 1. Add At-Risk Students Card (After course selector)
```html
<!-- At-Risk Dashboard -->
<div class="at-risk-container" style="display: none;" id="at-risk-dashboard">
    <div class="chart-container">
        <h3>⚠️ At-Risk Students</h3>
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.5rem;">
            <div style="background: #fee2e2; padding: 1rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #991b1b;" id="high-risk-count">0</div>
                <div style="font-size: 0.875rem; color: #991b1b;">High Risk</div>
            </div>
            <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #92400e;" id="medium-risk-count">0</div>
                <div style="font-size: 0.875rem; color: #92400e;">Medium Risk</div>
            </div>
            <div style="background: #d1fae5; padding: 1rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #065f46;" id="low-risk-count">0</div>
                <div style="font-size: 0.875rem; color: #065f46;">On Track</div>
            </div>
        </div>
        <div id="at-risk-list"></div>
    </div>
</div>
```

#### 2. Add Activity Heatmap Section
```html
<!-- Activity Heatmap -->
<div class="chart-container" id="heatmap-section" style="display: none;">
    <h3>📅 Class Activity Patterns</h3>
    <div id="heatmap-viz"></div>
    <div id="peak-hours" style="margin-top: 1.5rem;"></div>
</div>
```

#### 3. Add Student Modal for Drill-Down
```html
<!-- Student Detail Modal -->
<div id="student-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
    <div style="background: white; margin: 2rem auto; max-width: 1200px; border-radius: 8px; padding: 2rem; max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 id="modal-student-name">Student Details</h2>
            <button onclick="closeStudentModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
        </div>
        <div id="modal-student-content"></div>
    </div>
</div>
```

#### 4. Add JavaScript Functions
```javascript
// Load at-risk students
async function loadAtRiskStudents(courseId) {
    const response = await fetch(`${API_BASE}/analytics/course/${courseId}/at-risk/`, {
        headers: { 'Authorization': `Token ${token}` }
    });
    const data = await response.json();
    
    document.getElementById('high-risk-count').textContent = data.summary.high_risk;
    document.getElementById('medium-risk-count').textContent = data.summary.medium_risk;
    document.getElementById('low-risk-count').textContent = data.summary.low_risk;
    
    const list = document.getElementById('at-risk-list');
    list.innerHTML = data.students.filter(s => s.risk_level !== 'low').map(student => `
        <div style="background: ${student.color === 'red' ? '#fee2e2' : '#fef3c7'}; padding: 1rem; border-radius: 8px; margin: 0.5rem 0; cursor: pointer;"
             onclick="loadStudentDetail(${student.student_id})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-weight: 700;">${student.icon} ${student.first_name} ${student.last_name}</span>
                    <span style="color: #6b7280; margin-left: 0.5rem;">(${student.username})</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.875rem; color: #6b7280;">${student.metrics.total_runs} runs, ${student.metrics.days_since_activity} days inactive</div>
                </div>
            </div>
            <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
                ${student.risk_factors.join(' • ')}
            </div>
        </div>
    `).join('');
    
    document.getElementById('at-risk-dashboard').style.display = 'block';
}

// Load activity heatmap
async function loadActivityHeatmap(courseId) {
    const response = await fetch(`${API_BASE}/analytics/course/${courseId}/heatmap/`, {
        headers: { 'Authorization': `Token ${token}` }
    });
    const data = await response.json();
    
    // Display peak hours
    document.getElementById('peak-hours').innerHTML = `
        <h4>📊 Peak Activity Hours:</h4>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            ${data.peak_hours.map(([hour, count]) => `
                <div style="background: #dbeafe; padding: 0.75rem; border-radius: 4px;">
                    <div style="font-weight: 700;">${hour}:00</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">${count} activities</div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('heatmap-section').style.display = 'block';
}

// Load individual student details
async function loadStudentDetail(studentId) {
    const response = await fetch(`${API_BASE}/analytics/student/${studentId}/`, {
        headers: { 'Authorization': `Token ${token}` }
    });
    const data = await response.json();
    
    document.getElementById('modal-student-name').textContent = 
        `${data.student.first_name} ${data.student.last_name} (${data.student.username})`;
    
    document.getElementById('modal-student-content').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.875rem; color: #6b7280;">Total Runs</div>
                <div style="font-size: 2rem; font-weight: 700;">${data.summary.total_runs}</div>
            </div>
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.875rem; color: #6b7280;">Unique Tools</div>
                <div style="font-size: 2rem; font-weight: 700;">${data.summary.unique_tools}</div>
            </div>
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.875rem; color: #6b7280;">Active Days</div>
                <div style="font-size: 2rem; font-weight: 700;">${data.summary.unique_days_active}</div>
            </div>
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.875rem; color: #6b7280;">Days Since Activity</div>
                <div style="font-size: 2rem; font-weight: 700;">${data.summary.days_since_activity || 0}</div>
            </div>
        </div>
        
        <h4>Tool Usage:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
            ${data.tool_usage.slice(0, 10).map(tool => `
                <div style="background: #dbeafe; padding: 0.5rem 1rem; border-radius: 4px;">
                    ${tool.tool__name}: ${tool.count}
                </div>
            `).join('')}
        </div>
        
        <h4>Recent Activity:</h4>
        <div style="max-height: 300px; overflow-y: auto;">
            ${data.recent_activity.map(activity => `
                <div style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                    <div style="font-weight: 600;">${activity.tool}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">
                        ${new Date(activity.timestamp).toLocaleString()} • ${activity.scenario}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('student-modal').style.display = 'block';
}

function closeStudentModal() {
    document.getElementById('student-modal').style.display = 'none';
}

// Update onCourseChange to load new data
async function onCourseChange() {
    // ... existing code ...
    await loadAtRiskStudents(courseId);
    await loadActivityHeatmap(courseId);
}
```

## Implementation Priority

1. ✅ Backend deployed (DONE)
2. Student badges display
3. Student percentile comparison
4. Instructor at-risk alerts
5. Instructor activity heatmap
6. Instructor student drill-down modal

## Testing Checklist

- [ ] Student can see badges and progress
- [ ] Student percentile shows correctly for enrolled students
- [ ] Instructor sees at-risk students with color coding
- [ ] Instructor can click student name to see details
- [ ] Activity heatmap shows peak hours
- [ ] Modal closes properly
- [ ] All data loads without errors

## Next Steps

Apply these changes to the HTML files and test locally before deploying to Netlify.
