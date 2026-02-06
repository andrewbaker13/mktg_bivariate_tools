/**
 * Sales Territory Optimizer
 * Main application logic with embedded algorithms
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const STATE = {
  mode: 'demo', // 'demo' | 'upload' | 'manual'
  accounts: [],
  reps: [],
  territories: null,
  manualTerritories: [],
  showAllAccounts: false,
  map: null,
  territoryLayer: null,
  accountLayer: null,
  repLayer: null,
  drawnItems: null,
  drawControl: null,
  config: {
    algorithm: 'kmeans',
    priority: 'balance',
    maxAccounts: 30,
    maxTravel: 75,
    weights: {
      potential: 0.8,
      probability: 0.6,
      travel: 0.4
    }
  }
};

// Territory colors
const TERRITORY_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1'  // Indigo
];

// Color names and emoji for display
const COLOR_LABELS = [
  { name: 'Blue', emoji: '🔵' },
  { name: 'Green', emoji: '🟢' },
  { name: 'Amber', emoji: '🟠' },
  { name: 'Red', emoji: '🔴' },
  { name: 'Purple', emoji: '🟣' },
  { name: 'Pink', emoji: '🩷' },
  { name: 'Cyan', emoji: '🔵' },
  { name: 'Lime', emoji: '🟢' },
  { name: 'Orange', emoji: '🟠' },
  { name: 'Indigo', emoji: '🟣' }
];

// ============================================================================
// SCENARIO DATA
// ============================================================================

const SCENARIOS = {
  regional_b2b: {
    name: 'Regional B2B Sales Team (NYC Metro)',
    description: `
      <div class="scenario-content">
        <p><strong>Context:</strong> A manufacturing supplies company covers the NYC metro area with 4 field sales reps. Each rep has different experience levels and travel preferences.</p>
        <p><strong>Challenge:</strong> The current territory map was drawn 5 years ago. Since then, 40 new prospects have emerged in Brooklyn/Queens while Manhattan accounts have consolidated.</p>
        <p><strong>Your Task:</strong></p>
        <ul>
          <li>Re-balance territories accounting for new prospect distribution</li>
          <li>Respect Mike's preference to stay within 50 miles of home</li>
          <li>Ensure Sarah (highest closer) gets high-potential accounts</li>
        </ul>
        <p><strong>Data:</strong> 80 accounts across NYC metro, 4 sales reps with varying capacity and effectiveness.</p>
      </div>
    `,
    accounts: generateNYCAccounts(),
    reps: generateNYCReps()
  },
  retail_expansion: {
    name: 'Retail Expansion (Chicago)',
    description: `
      <div class="scenario-content">
        <p><strong>Context:</strong> A consumer goods company is expanding into the Chicago market with 3 new sales reps targeting independent retailers.</p>
        <p><strong>Challenge:</strong> All reps are new to the territory. Need to establish balanced territories that minimize driving time while ensuring fair opportunity.</p>
        <p><strong>Your Task:</strong></p>
        <ul>
          <li>Create compact, driveable territories</li>
          <li>Balance total revenue potential across reps</li>
          <li>Account for downtown traffic (higher travel cost)</li>
        </ul>
        <p><strong>Data:</strong> 65 retail prospects across Chicagoland, 3 new sales reps.</p>
      </div>
    `,
    accounts: generateChicagoAccounts(),
    reps: generateChicagoReps()
  },
  pharma_reps: {
    name: 'Pharmaceutical Sales (Northeast)',
    description: `
      <div class="scenario-content">
        <p><strong>Context:</strong> A pharmaceutical company covers the Northeast corridor with 5 medical sales reps calling on clinics and hospitals.</p>
        <p><strong>Challenge:</strong> Hospital accounts are high-value but concentrated in cities. Suburban clinics are numerous but smaller. Need balance.</p>
        <p><strong>Your Task:</strong></p>
        <ul>
          <li>Mix high-value hospital accounts with suburban clinics</li>
          <li>Respect travel constraints (some reps won't travel far)</li>
          <li>Align top performers with top accounts</li>
        </ul>
        <p><strong>Data:</strong> 95 medical facilities from Boston to DC, 5 experienced reps.</p>
      </div>
    `,
    accounts: generatePharmaAccounts(),
    reps: generatePharmaReps()
  },
  san_diego: {
    name: 'San Diego Tech Sales',
    description: `
      <div class="scenario-content">
        <p><strong>Context:</strong> A SaaS company is building out its San Diego territory with 4 account executives covering biotech, defense contractors, and tech startups.</p>
        <p><strong>Challenge:</strong> The territory spans from Oceanside to the border, with clusters in UTC, Downtown, Sorrento Valley, and Carlsbad. Traffic on I-5 and I-15 makes travel time unpredictable.</p>
        <p><strong>Your Task:</strong></p>
        <ul>
          <li>Create geographically compact territories that minimize freeway travel</li>
          <li>Balance the high-value biotech accounts in Torrey Pines/UTC</li>
          <li>Ensure the newer rep (lower effectiveness) gets a fair territory</li>
        </ul>
        <p><strong>Data:</strong> 70 accounts across San Diego County, 4 account executives.</p>
      </div>
    `,
    accounts: generateSanDiegoAccounts(),
    reps: generateSanDiegoReps()
  }
};

// ============================================================================
// DATA GENERATORS
// ============================================================================

function generateNYCAccounts() {
  const accounts = [];
  const regions = [
    { name: 'Manhattan', lat: 40.7831, lng: -73.9712, count: 20, potentialRange: [80000, 200000] },
    { name: 'Brooklyn', lat: 40.6782, lng: -73.9442, count: 25, potentialRange: [40000, 120000] },
    { name: 'Queens', lat: 40.7282, lng: -73.7949, count: 20, potentialRange: [30000, 100000] },
    { name: 'Bronx', lat: 40.8448, lng: -73.8648, count: 15, potentialRange: [25000, 80000] }
  ];
  
  let id = 1;
  regions.forEach(region => {
    for (let i = 0; i < region.count; i++) {
      accounts.push({
        account_id: `A${String(id).padStart(3, '0')}`,
        name: `${region.name} Account ${i + 1}`,
        lat: region.lat + (Math.random() - 0.5) * 0.08,
        lng: region.lng + (Math.random() - 0.5) * 0.08,
        annual_potential: Math.round(region.potentialRange[0] + Math.random() * (region.potentialRange[1] - region.potentialRange[0])),
        close_probability: 0.15 + Math.random() * 0.55,
        industry: ['Manufacturing', 'Technology', 'Healthcare', 'Retail'][Math.floor(Math.random() * 4)]
      });
      id++;
    }
  });
  
  return accounts;
}

function generateNYCReps() {
  return [
    { rep_id: 'R001', name: 'Sarah Chen', home_lat: 40.7484, home_lng: -73.9857, max_accounts: 25, max_travel_miles: 40, effectiveness: 1.25 },
    { rep_id: 'R002', name: 'Mike Johnson', home_lat: 40.6892, home_lng: -74.0445, max_accounts: 30, max_travel_miles: 50, effectiveness: 0.95 },
    { rep_id: 'R003', name: 'Lisa Park', home_lat: 40.7589, home_lng: -73.8500, max_accounts: 28, max_travel_miles: 60, effectiveness: 1.10 },
    { rep_id: 'R004', name: 'Tom Rivera', home_lat: 40.8200, home_lng: -73.9100, max_accounts: 22, max_travel_miles: 45, effectiveness: 0.88 }
  ];
}

function generateChicagoAccounts() {
  const accounts = [];
  const regions = [
    { name: 'Loop', lat: 41.8819, lng: -87.6278, count: 15, potentialRange: [60000, 150000] },
    { name: 'North Side', lat: 41.9500, lng: -87.6600, count: 18, potentialRange: [40000, 100000] },
    { name: 'South Side', lat: 41.7800, lng: -87.6200, count: 15, potentialRange: [30000, 90000] },
    { name: 'West Suburbs', lat: 41.8800, lng: -87.9500, count: 17, potentialRange: [50000, 120000] }
  ];
  
  let id = 1;
  regions.forEach(region => {
    for (let i = 0; i < region.count; i++) {
      accounts.push({
        account_id: `A${String(id).padStart(3, '0')}`,
        name: `${region.name} Retailer ${i + 1}`,
        lat: region.lat + (Math.random() - 0.5) * 0.1,
        lng: region.lng + (Math.random() - 0.5) * 0.1,
        annual_potential: Math.round(region.potentialRange[0] + Math.random() * (region.potentialRange[1] - region.potentialRange[0])),
        close_probability: 0.20 + Math.random() * 0.50,
        industry: 'Retail'
      });
      id++;
    }
  });
  
  return accounts;
}

function generateChicagoReps() {
  return [
    { rep_id: 'R001', name: 'Alex Martinez', home_lat: 41.8900, home_lng: -87.6350, max_accounts: 25, max_travel_miles: 35, effectiveness: 1.00 },
    { rep_id: 'R002', name: 'Jordan Lee', home_lat: 41.9300, home_lng: -87.7000, max_accounts: 25, max_travel_miles: 40, effectiveness: 1.05 },
    { rep_id: 'R003', name: 'Casey Williams', home_lat: 41.8100, home_lng: -87.8500, max_accounts: 25, max_travel_miles: 50, effectiveness: 0.95 }
  ];
}

function generatePharmaAccounts() {
  const accounts = [];
  const regions = [
    { name: 'Boston', lat: 42.3601, lng: -71.0589, count: 20, potentialRange: [100000, 300000] },
    { name: 'Hartford', lat: 41.7658, lng: -72.6734, count: 15, potentialRange: [50000, 150000] },
    { name: 'NYC Metro', lat: 40.7589, lng: -73.9851, count: 25, potentialRange: [80000, 250000] },
    { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, count: 20, potentialRange: [70000, 200000] },
    { name: 'DC Metro', lat: 38.9072, lng: -77.0369, count: 15, potentialRange: [90000, 280000] }
  ];
  
  let id = 1;
  regions.forEach(region => {
    for (let i = 0; i < region.count; i++) {
      const isHospital = Math.random() < 0.3;
      accounts.push({
        account_id: `A${String(id).padStart(3, '0')}`,
        name: `${region.name} ${isHospital ? 'Hospital' : 'Clinic'} ${i + 1}`,
        lat: region.lat + (Math.random() - 0.5) * 0.15,
        lng: region.lng + (Math.random() - 0.5) * 0.15,
        annual_potential: Math.round(region.potentialRange[0] + Math.random() * (region.potentialRange[1] - region.potentialRange[0])) * (isHospital ? 2 : 1),
        close_probability: isHospital ? 0.10 + Math.random() * 0.30 : 0.25 + Math.random() * 0.45,
        industry: 'Healthcare'
      });
      id++;
    }
  });
  
  return accounts;
}

function generatePharmaReps() {
  return [
    { rep_id: 'R001', name: 'Dr. Emily Foster', home_lat: 42.3500, home_lng: -71.0800, max_accounts: 20, max_travel_miles: 100, effectiveness: 1.30 },
    { rep_id: 'R002', name: 'James Wright', home_lat: 41.3000, home_lng: -72.9000, max_accounts: 22, max_travel_miles: 120, effectiveness: 1.15 },
    { rep_id: 'R003', name: 'Maria Santos', home_lat: 40.7500, home_lng: -74.0000, max_accounts: 20, max_travel_miles: 80, effectiveness: 1.20 },
    { rep_id: 'R004', name: 'David Kim', home_lat: 39.9500, home_lng: -75.2000, max_accounts: 18, max_travel_miles: 90, effectiveness: 1.10 },
    { rep_id: 'R005', name: 'Rachel Adams', home_lat: 38.9000, home_lng: -77.0500, max_accounts: 20, max_travel_miles: 85, effectiveness: 1.05 }
  ];
}

function generateSanDiegoAccounts() {
  const accounts = [];
  const regions = [
    { name: 'UTC/La Jolla', lat: 32.8701, lng: -117.2124, count: 18, potentialRange: [80000, 250000], industries: ['Biotech', 'Technology'] },
    { name: 'Sorrento Valley', lat: 32.8998, lng: -117.1936, count: 15, potentialRange: [60000, 180000], industries: ['Technology', 'Biotech'] },
    { name: 'Downtown', lat: 32.7157, lng: -117.1611, count: 12, potentialRange: [50000, 150000], industries: ['Professional Services', 'Technology'] },
    { name: 'Carlsbad', lat: 33.1581, lng: -117.3506, count: 10, potentialRange: [70000, 200000], industries: ['Biotech', 'Manufacturing'] },
    { name: 'Rancho Bernardo', lat: 33.0225, lng: -117.0728, count: 8, potentialRange: [55000, 140000], industries: ['Defense', 'Technology'] },
    { name: 'Chula Vista', lat: 32.6401, lng: -117.0842, count: 7, potentialRange: [30000, 90000], industries: ['Manufacturing', 'Professional Services'] }
  ];
  
  let id = 1;
  regions.forEach(region => {
    for (let i = 0; i < region.count; i++) {
      const industry = region.industries[Math.floor(Math.random() * region.industries.length)];
      accounts.push({
        account_id: `A${String(id).padStart(3, '0')}`,
        name: `${region.name} ${industry} ${i + 1}`,
        lat: region.lat + (Math.random() - 0.5) * 0.04,
        lng: region.lng + (Math.random() - 0.5) * 0.04,
        annual_potential: Math.round(region.potentialRange[0] + Math.random() * (region.potentialRange[1] - region.potentialRange[0])),
        close_probability: 0.20 + Math.random() * 0.50,
        industry: industry
      });
      id++;
    }
  });
  
  return accounts;
}

function generateSanDiegoReps() {
  return [
    { rep_id: 'R001', name: 'Christina Reyes', home_lat: 32.8328, home_lng: -117.2713, max_accounts: 20, max_travel_miles: 25, effectiveness: 1.20 },
    { rep_id: 'R002', name: 'Brian Nguyen', home_lat: 32.9595, home_lng: -117.1244, max_accounts: 22, max_travel_miles: 30, effectiveness: 1.10 },
    { rep_id: 'R003', name: 'Amanda Foster', home_lat: 32.7157, home_lng: -117.1611, max_accounts: 18, max_travel_miles: 35, effectiveness: 0.85 },
    { rep_id: 'R004', name: 'Marcus Thompson', home_lat: 33.1209, home_lng: -117.2864, max_accounts: 20, max_travel_miles: 40, effectiveness: 1.05 }
  ];
}

// ============================================================================
// ALGORITHMS
// ============================================================================

/**
 * Balanced K-Means with capacity constraints
 */
function runKMeans(accounts, reps, config) {
  const maxIter = 50;
  
  // Initialize centroids at rep home locations
  let centroids = reps.map(r => ({
    lat: r.home_lat,
    lng: r.home_lng,
    rep: r,
    assigned: []
  }));
  
  let prevAssignments = null;
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Clear assignments
    centroids.forEach(c => c.assigned = []);
    
    // Sort accounts by weighted value (higher priority first)
    const sortedAccounts = [...accounts].sort((a, b) => {
      const valA = a.annual_potential * a.close_probability;
      const valB = b.annual_potential * b.close_probability;
      return valB - valA;
    });
    
    // Assign each account to nearest centroid with capacity
    const repCounts = new Map(reps.map(r => [r.rep_id, 0]));
    
    sortedAccounts.forEach(account => {
      // Find eligible centroids (under capacity)
      const eligible = centroids.filter(c => 
        repCounts.get(c.rep.rep_id) < c.rep.max_accounts
      );
      
      if (eligible.length === 0) {
        // All full, assign to least loaded
        const leastLoaded = centroids.reduce((min, c) => 
          repCounts.get(c.rep.rep_id) < repCounts.get(min.rep.rep_id) ? c : min
        );
        leastLoaded.assigned.push(account);
        repCounts.set(leastLoaded.rep.rep_id, repCounts.get(leastLoaded.rep.rep_id) + 1);
      } else {
        // Find nearest eligible
        let nearest = eligible[0];
        let minDist = haversineDistance(account.lat, account.lng, nearest.lat, nearest.lng);
        
        eligible.forEach(c => {
          const dist = haversineDistance(account.lat, account.lng, c.lat, c.lng);
          if (dist < minDist) {
            minDist = dist;
            nearest = c;
          }
        });
        
        nearest.assigned.push(account);
        repCounts.set(nearest.rep.rep_id, repCounts.get(nearest.rep.rep_id) + 1);
      }
    });
    
    // Check convergence
    const currentAssignments = JSON.stringify(centroids.map(c => c.assigned.map(a => a.account_id).sort()));
    if (currentAssignments === prevAssignments) break;
    prevAssignments = currentAssignments;
    
    // Update centroids to weighted center of assigned accounts
    centroids.forEach(c => {
      if (c.assigned.length > 0) {
        let totalWeight = 0;
        let weightedLat = 0;
        let weightedLng = 0;
        
        c.assigned.forEach(a => {
          const weight = a.annual_potential;
          weightedLat += a.lat * weight;
          weightedLng += a.lng * weight;
          totalWeight += weight;
        });
        
        // Blend with rep home location (50/50)
        c.lat = (weightedLat / totalWeight + c.rep.home_lat) / 2;
        c.lng = (weightedLng / totalWeight + c.rep.home_lng) / 2;
      }
    });
  }
  
  return buildTerritoryResult(centroids, accounts, reps);
}

/**
 * Greedy nearest neighbor assignment
 */
function runGreedy(accounts, reps, config) {
  const assignments = new Map();
  const repCounts = new Map(reps.map(r => [r.rep_id, 0]));
  
  // Sort accounts by distance to nearest rep (closest first)
  const accountsWithDist = accounts.map(a => {
    const distances = reps.map(r => ({
      rep: r,
      dist: haversineDistance(a.lat, a.lng, r.home_lat, r.home_lng)
    }));
    distances.sort((x, y) => x.dist - y.dist);
    return { account: a, sortedReps: distances };
  });
  
  // Sort by closest distance
  accountsWithDist.sort((a, b) => a.sortedReps[0].dist - b.sortedReps[0].dist);
  
  // Assign greedily
  accountsWithDist.forEach(item => {
    const { account, sortedReps } = item;
    
    // Find first rep with capacity
    for (const { rep, dist } of sortedReps) {
      if (repCounts.get(rep.rep_id) < rep.max_accounts) {
        assignments.set(account.account_id, rep.rep_id);
        repCounts.set(rep.rep_id, repCounts.get(rep.rep_id) + 1);
        break;
      }
    }
    
    // If all full, assign to least loaded
    if (!assignments.has(account.account_id)) {
      let minLoad = Infinity;
      let bestRep = reps[0];
      reps.forEach(r => {
        if (repCounts.get(r.rep_id) < minLoad) {
          minLoad = repCounts.get(r.rep_id);
          bestRep = r;
        }
      });
      assignments.set(account.account_id, bestRep.rep_id);
      repCounts.set(bestRep.rep_id, repCounts.get(bestRep.rep_id) + 1);
    }
  });
  
  // Convert to centroids format
  const centroids = reps.map(r => ({
    lat: r.home_lat,
    lng: r.home_lng,
    rep: r,
    assigned: accounts.filter(a => assignments.get(a.account_id) === r.rep_id)
  }));
  
  return buildTerritoryResult(centroids, accounts, reps);
}

/**
 * Weighted Voronoi (simplified - uses greedy with distance weighting)
 */
function runVoronoi(accounts, reps, config) {
  const assignments = new Map();
  const repCounts = new Map(reps.map(r => [r.rep_id, 0]));
  
  // Assign each account based on weighted distance
  accounts.forEach(account => {
    let bestRep = null;
    let bestScore = -Infinity;
    
    reps.forEach(rep => {
      const dist = haversineDistance(account.lat, account.lng, rep.home_lat, rep.home_lng);
      const capacityRatio = 1 - (repCounts.get(rep.rep_id) / rep.max_accounts);
      
      // Score: closer is better, more capacity is better, higher effectiveness is better
      const score = -dist + capacityRatio * 20 + rep.effectiveness * 10;
      
      if (score > bestScore && repCounts.get(rep.rep_id) < rep.max_accounts) {
        bestScore = score;
        bestRep = rep;
      }
    });
    
    if (!bestRep) {
      // All full, use least loaded
      let minLoad = Infinity;
      reps.forEach(r => {
        if (repCounts.get(r.rep_id) < minLoad) {
          minLoad = repCounts.get(r.rep_id);
          bestRep = r;
        }
      });
    }
    
    assignments.set(account.account_id, bestRep.rep_id);
    repCounts.set(bestRep.rep_id, repCounts.get(bestRep.rep_id) + 1);
  });
  
  // Convert to centroids format
  const centroids = reps.map(r => ({
    lat: r.home_lat,
    lng: r.home_lng,
    rep: r,
    assigned: accounts.filter(a => assignments.get(a.account_id) === r.rep_id)
  }));
  
  return buildTerritoryResult(centroids, accounts, reps);
}

/**
 * Build standardized territory result from algorithm output
 */
function buildTerritoryResult(centroids, accounts, reps) {
  const territories = centroids.map((c, idx) => {
    const assigned = c.assigned;
    const rep = c.rep;
    
    // Calculate metrics
    const totalPotential = assigned.reduce((sum, a) => sum + a.annual_potential, 0);
    const expectedRevenue = assigned.reduce((sum, a) => 
      sum + a.annual_potential * a.close_probability * rep.effectiveness, 0);
    const totalTravel = assigned.reduce((sum, a) => 
      sum + haversineDistance(a.lat, a.lng, rep.home_lat, rep.home_lng), 0);
    const avgTravel = assigned.length > 0 ? totalTravel / assigned.length : 0;
    
    // Compactness: ratio of avg distance to centroid vs max possible
    let compactness = 1;
    if (assigned.length > 1) {
      const centroid = {
        lat: assigned.reduce((s, a) => s + a.lat, 0) / assigned.length,
        lng: assigned.reduce((s, a) => s + a.lng, 0) / assigned.length
      };
      const avgDist = assigned.reduce((s, a) => 
        s + haversineDistance(a.lat, a.lng, centroid.lat, centroid.lng), 0) / assigned.length;
      compactness = Math.max(0, 1 - avgDist / 50); // Normalize by 50 miles max
    }
    
    return {
      rep_id: rep.rep_id,
      rep_name: rep.name,
      accounts: assigned.map(a => a.account_id),
      color: TERRITORY_COLORS[idx % TERRITORY_COLORS.length],
      metrics: {
        total_potential: totalPotential,
        expected_revenue: Math.round(expectedRevenue),
        account_count: assigned.length,
        total_travel_miles: Math.round(totalTravel * 10) / 10,
        avg_travel_miles: Math.round(avgTravel * 10) / 10,
        workload_score: assigned.length / rep.max_accounts,
        compactness: Math.round(compactness * 100) / 100
      }
    };
  });
  
  // Calculate global metrics
  const workloads = territories.map(t => t.metrics.workload_score);
  const potentials = territories.map(t => t.metrics.total_potential);
  const meanWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
  const meanPotential = potentials.reduce((a, b) => a + b, 0) / potentials.length;
  
  const workloadStd = Math.sqrt(workloads.reduce((s, w) => s + (w - meanWorkload) ** 2, 0) / workloads.length);
  const potentialStd = Math.sqrt(potentials.reduce((s, p) => s + (p - meanPotential) ** 2, 0) / potentials.length);
  
  const balanceCV = meanPotential > 0 ? potentialStd / meanPotential : 0;
  const avgTravel = territories.reduce((s, t) => s + t.metrics.avg_travel_miles, 0) / territories.length;
  const avgCompactness = territories.reduce((s, t) => s + t.metrics.compactness, 0) / territories.length;
  
  // Revenue alignment: correlation between rep effectiveness and territory potential
  const repEffectiveness = territories.map(t => 
    reps.find(r => r.rep_id === t.rep_id).effectiveness);
  const revenueAlignment = calculateCorrelation(repEffectiveness, potentials);
  
  return {
    territories,
    global_metrics: {
      balance_cv: Math.round(balanceCV * 1000) / 1000,
      balance_score: Math.max(0, Math.round((1 - balanceCV) * 100)),
      avg_travel_miles: Math.round(avgTravel * 10) / 10,
      travel_score: Math.max(0, Math.round((1 - avgTravel / 50) * 100)),
      revenue_alignment: Math.round(revenueAlignment * 100) / 100,
      revenue_score: Math.max(0, Math.round((revenueAlignment + 1) * 50)),
      compactness_score: Math.round(avgCompactness * 100),
      total_accounts: accounts.length,
      covered_accounts: territories.reduce((s, t) => s + t.accounts.length, 0)
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Haversine distance between two points (in miles)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate Pearson correlation
 */
function calculateCorrelation(x, y) {
  const n = x.length;
  if (n < 2) return 0;
  
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    denX += (x[i] - meanX) ** 2;
    denY += (y[i] - meanY) ** 2;
  }
  
  const den = Math.sqrt(denX * denY);
  return den > 0 ? num / den : 0;
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length !== headers.length) continue;
    
    const row = {};
    headers.forEach((h, idx) => {
      const val = values[idx];
      // Try to parse as number
      const num = parseFloat(val);
      row[h] = isNaN(num) ? val : num;
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Format currency
 */
function formatCurrency(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

// ============================================================================
// MAP VISUALIZATION
// ============================================================================

function initializeMap() {
  // Default center (USA)
  const center = [39.8283, -98.5795];
  const zoom = 4;
  
  STATE.map = L.map('territory-map').setView(center, zoom);
  
  // Available tile layers
  STATE.tileLayers = {
    minimal: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }),
    standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    })
  };
  
  // Default to minimal style
  STATE.currentTileLayer = STATE.tileLayers.minimal;
  STATE.currentTileLayer.addTo(STATE.map);
  
  // Create layer groups
  STATE.territoryLayer = L.layerGroup().addTo(STATE.map);
  STATE.accountLayer = L.layerGroup().addTo(STATE.map);
  STATE.repLayer = L.layerGroup().addTo(STATE.map);
  
  // Initialize drawing tools (for manual mode)
  STATE.drawnItems = new L.FeatureGroup();
  STATE.map.addLayer(STATE.drawnItems);
  
  STATE.drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      polygon: {
        shapeOptions: { color: '#3b82f6', weight: 2 },
        showArea: true,
        metric: false
      },
      polyline: false,
      rectangle: {
        shapeOptions: { color: '#3b82f6', weight: 2 }
      },
      circle: false,
      circlemarker: false,
      marker: false
    },
    edit: false // Hide edit/delete buttons - users can clear all and redraw
  });
}

function renderTerritories(result) {
  if (!STATE.map) return;
  
  // Clear existing layers
  STATE.territoryLayer.clearLayers();
  STATE.accountLayer.clearLayers();
  STATE.repLayer.clearLayers();
  
  const allPoints = [];
  
  result.territories.forEach((territory, idx) => {
    const rep = STATE.reps.find(r => r.rep_id === territory.rep_id);
    const accounts = STATE.accounts.filter(a => territory.accounts.includes(a.account_id));
    const color = territory.color;
    
    // Get points for this territory
    const points = accounts.map(a => [a.lng, a.lat]);
    
    if (points.length >= 3) {
      // Create convex hull
      try {
        const hull = turf.convex(turf.points(points));
        if (hull) {
          // Add buffer for visual separation
          const buffered = turf.buffer(hull, 0.5, { units: 'miles' });
          L.geoJSON(buffered, {
            style: {
              color: color,
              fillColor: color,
              fillOpacity: 0.15,
              weight: 2
            }
          }).addTo(STATE.territoryLayer);
        }
      } catch (e) {
        console.log('Hull error for territory', territory.rep_id);
      }
    }
    
    // Add account markers
    accounts.forEach(account => {
      const radius = Math.sqrt(account.annual_potential / 10000) * 2 + 4;
      const marker = L.circleMarker([account.lat, account.lng], {
        radius: radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2
      })
      .bindPopup(`
        <strong>${account.name}</strong><br>
        Potential: ${formatCurrency(account.annual_potential)}<br>
        Close Prob: ${(account.close_probability * 100).toFixed(0)}%<br>
        Assigned: ${rep.name}
      `);
      
      marker.addTo(STATE.accountLayer);
      allPoints.push([account.lat, account.lng]);
    });
    
    // Add rep marker
    const repIcon = L.divIcon({
      className: 'rep-marker',
      html: `<div style="
        width: 20px; 
        height: 20px; 
        background: ${color}; 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
      ">★</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    L.marker([rep.home_lat, rep.home_lng], { icon: repIcon })
      .bindPopup(`
        <strong>${rep.name}</strong><br>
        Accounts: ${territory.metrics.account_count}<br>
        Potential: ${formatCurrency(territory.metrics.total_potential)}<br>
        Avg Travel: ${territory.metrics.avg_travel_miles} mi
      `)
      .addTo(STATE.repLayer);
    
    allPoints.push([rep.home_lat, rep.home_lng]);
  });
  
  // Use existing bounds if set, otherwise set them
  if (allPoints.length > 0) {
    if (STATE.dataBounds) {
      // Bounds already set from scenario load - just fit to data
      STATE.map.fitBounds(allPoints, { padding: [30, 30] });
    } else {
      // Set bounds for first time
      setMapBoundsFromPoints(allPoints);
    }
  }
  
  // Update legend
  renderLegend(result.territories);
}

function renderLegend(territories) {
  const legend = document.getElementById('map-legend');
  legend.innerHTML = `
    <div class="legend-items">
      ${territories.map(t => `
        <div class="legend-item">
          <span class="legend-color" style="background: ${t.color}"></span>
          <span>${t.rep_name} (${t.metrics.account_count})</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// UI UPDATES
// ============================================================================

function renderScorecard(metrics) {
  document.getElementById('scorecard-section').classList.remove('hidden');
  
  // Update score bars
  const setScore = (id, value, label) => {
    document.getElementById(`score-${id}`).style.width = `${Math.min(100, Math.max(0, value))}%`;
    document.getElementById(`score-${id}-value`).textContent = label || `${value}%`;
  };
  
  setScore('balance', metrics.balance_score);
  setScore('travel', metrics.travel_score);
  setScore('revenue', metrics.revenue_score);
  setScore('compactness', metrics.compactness_score);
  
  // Overall score (weighted average)
  const overall = Math.round(
    (metrics.balance_score * 0.3 + 
     metrics.travel_score * 0.25 + 
     metrics.revenue_score * 0.25 + 
     metrics.compactness_score * 0.2)
  );
  document.getElementById('overall-score').textContent = `${overall}%`;
}

function renderBreakdown(territories) {
  document.getElementById('breakdown-section').classList.remove('hidden');
  
  const grid = document.getElementById('breakdown-grid');
  grid.innerHTML = territories.map(t => `
    <div class="territory-card" style="border-color: ${t.color}">
      <h4>
        <span class="territory-color" style="background: ${t.color}"></span>
        ${t.rep_name}
      </h4>
      <div class="territory-stats">
        <div class="territory-stat">
          <span class="stat-label">Accounts</span>
          <span class="stat-value">${t.metrics.account_count}</span>
        </div>
        <div class="territory-stat">
          <span class="stat-label">Potential</span>
          <span class="stat-value">${formatCurrency(t.metrics.total_potential)}</span>
        </div>
        <div class="territory-stat">
          <span class="stat-label">Expected Rev</span>
          <span class="stat-value">${formatCurrency(t.metrics.expected_revenue)}</span>
        </div>
        <div class="territory-stat">
          <span class="stat-label">Avg Travel</span>
          <span class="stat-value">${t.metrics.avg_travel_miles} mi</span>
        </div>
        <div class="territory-stat">
          <span class="stat-label">Workload</span>
          <span class="stat-value">${Math.round(t.metrics.workload_score * 100)}%</span>
        </div>
        <div class="territory-stat">
          <span class="stat-label">Compactness</span>
          <span class="stat-value">${Math.round(t.metrics.compactness * 100)}%</span>
        </div>
      </div>
    </div>
  `).join('');
}

function showExportSection() {
  document.getElementById('export-section').classList.remove('hidden');
}

function updateOptimizeButton() {
  const btn = document.getElementById('run-optimization');
  btn.disabled = STATE.accounts.length === 0 || STATE.reps.length === 0;
}

// ============================================================================
// CONSTRAINTS PANEL
// ============================================================================

function updateConstraintsPanel() {
  // Show the data overview section (which contains the constraints panel)
  // This is visible regardless of mode when data is loaded
  const dataOverviewSection = document.getElementById('data-overview-section');
  
  if (STATE.accounts.length === 0 || STATE.reps.length === 0) {
    dataOverviewSection.classList.add('hidden');
    return;
  }
  
  dataOverviewSection.classList.remove('hidden');
  
  // Calculate summary stats
  const totalAccounts = STATE.accounts.length;
  const totalPotential = STATE.accounts.reduce((sum, a) => sum + (a.annual_potential || 0), 0);
  const avgProb = STATE.accounts.reduce((sum, a) => sum + (a.close_probability || 0), 0) / totalAccounts;
  const numReps = STATE.reps.length;
  
  // Update summary line
  document.getElementById('constraints-summary').textContent = 
    `${numReps} reps, ${totalAccounts} accounts, $${(totalPotential / 1000000).toFixed(1)}M potential`;
  
  // Update constraint inputs
  document.getElementById('constraint-num-reps').value = numReps;
  document.getElementById('constraint-max-accounts').value = STATE.config.maxAccounts;
  document.getElementById('constraint-max-travel').value = STATE.config.maxTravel;
  
  // Update territory metrics
  document.getElementById('constraint-total-accounts').textContent = totalAccounts;
  document.getElementById('constraint-total-potential').textContent = '$' + totalPotential.toLocaleString();
  document.getElementById('constraint-avg-prob').textContent = (avgProb * 100).toFixed(1) + '%';
  
  // Populate rep table with editable fields and color indicators
  const tbody = document.getElementById('constraint-rep-table').querySelector('tbody');
  tbody.innerHTML = STATE.reps.map((rep, idx) => {
    const lat = rep.home_lat || rep.lat || 0;
    const lng = rep.home_lng || rep.lng || 0;
    const colorInfo = COLOR_LABELS[idx % COLOR_LABELS.length];
    const maxAccts = rep.max_accounts || STATE.config.maxAccounts;
    const maxTravel = rep.max_travel_miles || STATE.config.maxTravel;
    const effectiveness = (rep.effectiveness || 1) * 100;
    
    return `
    <tr data-rep-index="${idx}">
      <td>
        <span class="rep-color-indicator" style="background: ${TERRITORY_COLORS[idx % TERRITORY_COLORS.length]}"></span>
        <span class="rep-color-emoji">${colorInfo.emoji}</span>
        <strong>${rep.name}</strong>
      </td>
      <td>${lat.toFixed(3)}, ${lng.toFixed(3)}</td>
      <td><input type="number" class="rep-editable" data-field="max_accounts" value="${maxAccts}" min="1" max="100" disabled></td>
      <td><input type="number" class="rep-editable" data-field="max_travel_miles" value="${maxTravel}" min="1" max="500" disabled> mi</td>
      <td><input type="number" class="rep-editable" data-field="effectiveness" value="${effectiveness.toFixed(0)}" min="50" max="200" disabled>%</td>
    </tr>
  `;
  }).join('');
  
  // Add event listeners to rep editable fields
  document.querySelectorAll('.rep-editable').forEach(input => {
    input.addEventListener('change', (e) => {
      const row = e.target.closest('tr');
      const repIndex = parseInt(row.dataset.repIndex);
      const field = e.target.dataset.field;
      let value = parseFloat(e.target.value);
      
      if (field === 'effectiveness') {
        value = value / 100; // Convert from percentage
      }
      
      STATE.reps[repIndex][field] = value;
    });
  });
  
  // Populate accounts table (show first 10 by default)
  STATE.showAllAccounts = false;
  updateAccountsTable();
  
  // Ensure lock is reset to checked
  const lockCheckbox = document.getElementById('lock-constraints');
  lockCheckbox.checked = true;
  setConstraintsLocked(true);
}

function updateAccountsTable() {
  const tbody = document.getElementById('constraint-accounts-table').querySelector('tbody');
  const toggleBtn = document.getElementById('toggle-all-accounts');
  const countSpan = document.getElementById('accounts-table-count');
  
  const previewCount = 10;
  const showAll = STATE.showAllAccounts;
  const accountsToShow = showAll ? STATE.accounts : STATE.accounts.slice(0, previewCount);
  
  countSpan.textContent = `(showing ${accountsToShow.length} of ${STATE.accounts.length})`;
  
  tbody.innerHTML = accountsToShow.map(acc => `
    <tr>
      <td><strong>${acc.name}</strong></td>
      <td>${acc.lat.toFixed(3)}, ${acc.lng.toFixed(3)}</td>
      <td>$${(acc.annual_potential || 0).toLocaleString()}</td>
      <td>${((acc.close_probability || 0) * 100).toFixed(0)}%</td>
      <td>${acc.industry || '--'}</td>
    </tr>
  `).join('');
  
  // Update toggle button
  if (STATE.accounts.length > previewCount) {
    toggleBtn.textContent = showAll ? `Show first ${previewCount} accounts` : `Show all ${STATE.accounts.length} accounts`;
    toggleBtn.style.display = 'inline-block';
  } else {
    toggleBtn.style.display = 'none';
  }
}

function setConstraintsLocked(locked) {
  const inputs = [
    'constraint-num-reps',
    'constraint-max-accounts', 
    'constraint-max-travel'
  ];
  
  inputs.forEach(id => {
    const input = document.getElementById(id);
    input.disabled = locked;
  });
  
  // Also toggle rep table editable fields
  document.querySelectorAll('.rep-editable').forEach(input => {
    input.disabled = locked;
  });
}

function downloadScenarioData() {
  if (STATE.accounts.length === 0 && STATE.reps.length === 0) {
    alert('No scenario data loaded.');
    return;
  }
  
  // Build CSV content - combine accounts and reps
  let csvContent = '';
  
  // Accounts section
  csvContent += '# ACCOUNTS\n';
  if (STATE.accounts.length > 0) {
    const accountHeaders = ['account_id', 'name', 'lat', 'lng', 'annual_potential', 'close_probability'];
    csvContent += accountHeaders.join(',') + '\n';
    STATE.accounts.forEach(a => {
      csvContent += [
        a.account_id || '',
        `"${(a.name || '').replace(/"/g, '""')}"`,
        a.lat,
        a.lng,
        a.annual_potential || 0,
        (a.close_probability || 0).toFixed(3)
      ].join(',') + '\n';
    });
  }
  
  csvContent += '\n# SALES REPS\n';
  if (STATE.reps.length > 0) {
    const repHeaders = ['rep_id', 'name', 'lat', 'lng', 'max_accounts', 'max_travel_miles', 'effectiveness'];
    csvContent += repHeaders.join(',') + '\n';
    STATE.reps.forEach(r => {
      const lat = r.home_lat || r.lat || 0;
      const lng = r.home_lng || r.lng || 0;
      csvContent += [
        r.rep_id || '',
        `"${(r.name || '').replace(/"/g, '""')}"`,
        lat,
        lng,
        r.max_accounts || STATE.config.maxAccounts,
        r.max_travel_miles || STATE.config.maxTravel,
        (r.effectiveness || 1).toFixed(2)
      ].join(',') + '\n';
    });
  }
  
  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'territory_scenario_data.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function initializeEventHandlers() {
  // Mode toggle
  document.querySelectorAll('.mode-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const mode = btn.dataset.mode;
      STATE.mode = mode;
      
      // Update description
      const descriptions = {
        demo: 'Explore pre-built marketing scenarios with realistic account and rep data.',
        upload: 'Upload your own CSV files with account and sales rep data.',
        manual: 'Draw custom territory polygons on the map and compare against algorithms.'
      };
      document.getElementById('mode-description').textContent = descriptions[mode];
      
      // Toggle sections
      document.getElementById('scenario-section').classList.toggle('hidden', mode !== 'demo');
      document.getElementById('upload-section').classList.toggle('hidden', mode !== 'upload');
      document.getElementById('manual-section').classList.toggle('hidden', mode !== 'manual');
      
      // Toggle draw control
      if (mode === 'manual') {
        STATE.map.addControl(STATE.drawControl);
      } else {
        STATE.map.removeControl(STATE.drawControl);
        STATE.drawnItems.clearLayers();
      }
    });
  });
  
  // Scenario selection
  document.getElementById('scenario-select').addEventListener('change', (e) => {
    const scenarioId = e.target.value;
    if (!scenarioId) {
      document.getElementById('scenario-description').innerHTML = '';
      document.getElementById('data-overview-section').classList.add('hidden');
      STATE.accounts = [];
      STATE.reps = [];
      updateOptimizeButton();
      clearMapBoundsConstraints();
      return;
    }
    
    // Clear previous bounds so they get recalculated for new scenario
    clearMapBoundsConstraints();
    
    const scenario = SCENARIOS[scenarioId];
    document.getElementById('scenario-description').innerHTML = scenario.description;
    
    // Load scenario data
    STATE.accounts = scenario.accounts;
    STATE.reps = scenario.reps;
    updateOptimizeButton();
    
    // Update and show constraints panel
    updateConstraintsPanel();
    
    // Show accounts on map (unassigned)
    renderUnassignedAccounts();
  });
  
  // Algorithm selection
  document.getElementById('algorithm-select').addEventListener('change', (e) => {
    STATE.config.algorithm = e.target.value;
  });
  
  // Priority selection
  document.querySelectorAll('input[name="priority"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      STATE.config.priority = e.target.value;
    });
  });
  
  // Constraint inputs
  document.getElementById('max-accounts').addEventListener('change', (e) => {
    STATE.config.maxAccounts = parseInt(e.target.value) || 30;
  });
  
  document.getElementById('max-travel').addEventListener('change', (e) => {
    STATE.config.maxTravel = parseInt(e.target.value) || 75;
  });
  
  // Weight sliders
  ['potential', 'probability', 'travel'].forEach(key => {
    const slider = document.getElementById(`weight-${key}`);
    const display = document.getElementById(`weight-${key}-value`);
    slider.addEventListener('input', () => {
      STATE.config.weights[key] = parseFloat(slider.value);
      display.textContent = slider.value;
    });
  });
  
  // Run optimization button
  document.getElementById('run-optimization').addEventListener('click', runOptimization);
  
  // File upload handlers
  setupFileUpload('accounts');
  setupFileUpload('reps');
  
  // Template downloads
  document.getElementById('accounts-template-download').addEventListener('click', downloadAccountsTemplate);
  document.getElementById('reps-template-download').addEventListener('click', downloadRepsTemplate);
  
  // Constraints panel handlers
  document.getElementById('lock-constraints').addEventListener('change', (e) => {
    setConstraintsLocked(e.target.checked);
  });
  
  document.getElementById('download-scenario-data').addEventListener('click', downloadScenarioData);
  
  // Sync constraint inputs back to STATE when unlocked
  document.getElementById('constraint-max-accounts').addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || STATE.config.maxAccounts;
    STATE.config.maxAccounts = value;
    document.getElementById('max-accounts').value = value; // sync with main config
  });
  
  document.getElementById('constraint-max-travel').addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || STATE.config.maxTravel;
    STATE.config.maxTravel = value;
    document.getElementById('max-travel').value = value; // sync with main config
  });
  
  // Toggle all accounts button
  document.getElementById('toggle-all-accounts').addEventListener('click', () => {
    STATE.showAllAccounts = !STATE.showAllAccounts;
    updateAccountsTable();
  });
  
  // Export handlers
  document.getElementById('export-assignments').addEventListener('click', exportAssignments);
  document.getElementById('export-map').addEventListener('click', exportMap);
  document.getElementById('copy-summary').addEventListener('click', copySummary);
  
  // Manual drawing events
  STATE.map.on(L.Draw.Event.CREATED, handleDrawCreated);
  document.getElementById('clear-drawings').addEventListener('click', clearDrawings);
  document.getElementById('score-manual').addEventListener('click', scoreManualTerritories);
  
  // Map style selector
  document.getElementById('map-style').addEventListener('change', (e) => {
    const style = e.target.value;
    // Remove current tile layer
    STATE.map.removeLayer(STATE.currentTileLayer);
    // Add new tile layer
    STATE.currentTileLayer = STATE.tileLayers[style];
    STATE.currentTileLayer.addTo(STATE.map);
  });
  
  // Manual mode scenario loader
  document.getElementById('manual-scenario-select').addEventListener('change', (e) => {
    const scenarioId = e.target.value;
    if (!scenarioId) return;
    
    // Clear previous bounds
    clearMapBoundsConstraints();
    
    const scenario = SCENARIOS[scenarioId];
    STATE.accounts = scenario.accounts;
    STATE.reps = scenario.reps;
    
    // Show accounts on map  
    renderUnassignedAccounts();
    
    // Update and show constraints panel (same as demo mode)
    updateConstraintsPanel();
    
    // Update status
    document.getElementById('manual-status').textContent = 
      `Loaded ${STATE.accounts.length} accounts and ${STATE.reps.length} reps. Now draw territories!`;
    
    // Ensure draw control is visible
    if (!STATE.map.hasLayer(STATE.drawControl)) {
      STATE.map.addControl(STATE.drawControl);
    }
  });
  
  // Reset view button
  document.getElementById('reset-view').addEventListener('click', () => {
    if (STATE.dataCenter && STATE.dataZoom) {
      STATE.map.setView(STATE.dataCenter, STATE.dataZoom);
    } else if (STATE.dataBounds) {
      STATE.map.fitBounds(STATE.dataBounds);
    }
  });
}

function setupFileUpload(type) {
  const dropzone = document.getElementById(`${type}-dropzone`);
  const input = document.getElementById(`${type}-input`);
  const status = document.getElementById(`${type}-upload-status`);
  const browse = document.getElementById(`${type}-browse`);
  
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = parseCSV(e.target.result);
      
      if (type === 'accounts') {
        // Validate accounts format
        if (!data[0]?.lat || !data[0]?.lng) {
          status.textContent = 'Error: CSV must have lat and lng columns';
          status.className = 'upload-status error';
          return;
        }
        STATE.accounts = data.map((row, idx) => ({
          account_id: row.account_id || `A${String(idx + 1).padStart(3, '0')}`,
          name: row.name || `Account ${idx + 1}`,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          annual_potential: parseFloat(row.annual_potential) || 50000,
          close_probability: parseFloat(row.close_probability) || 0.3,
          industry: row.industry || 'General'
        }));
        status.textContent = `Loaded ${STATE.accounts.length} accounts`;
        status.className = 'upload-status success';
      } else {
        // Validate reps format
        if (!data[0]?.home_lat || !data[0]?.home_lng) {
          status.textContent = 'Error: CSV must have home_lat and home_lng columns';
          status.className = 'upload-status error';
          return;
        }
        STATE.reps = data.map((row, idx) => ({
          rep_id: row.rep_id || `R${String(idx + 1).padStart(3, '0')}`,
          name: row.name || `Rep ${idx + 1}`,
          home_lat: parseFloat(row.home_lat),
          home_lng: parseFloat(row.home_lng),
          max_accounts: parseInt(row.max_accounts) || 30,
          max_travel_miles: parseFloat(row.max_travel_miles) || 75,
          effectiveness: parseFloat(row.effectiveness) || 1.0
        }));
        status.textContent = `Loaded ${STATE.reps.length} reps`;
      // Clear previous bounds when new data is uploaded
      clearMapBoundsConstraints();
      
        status.className = 'upload-status success';
      }
      
      updateOptimizeButton();
      if (STATE.accounts.length > 0) renderUnassignedAccounts();
    };
    reader.readAsText(file);
  };
  
  dropzone.addEventListener('click', () => input.click());
  browse.addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dropzone--dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dropzone--dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dropzone--dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });
}

function renderUnassignedAccounts() {
  STATE.accountLayer.clearLayers();
  STATE.repLayer.clearLayers();
  
  const allPoints = [];
  
  // Show all accounts in gray
  STATE.accounts.forEach(account => {
    const radius = Math.sqrt(account.annual_potential / 10000) * 2 + 4;
    L.circleMarker([account.lat, account.lng], {
      radius: radius,
      color: '#64748b',
      fillColor: '#94a3b8',
      fillOpacity: 0.5,
      weight: 1
    })
    .bindPopup(`
      <strong>${account.name}</strong><br>
      Potential: ${formatCurrency(account.annual_potential)}<br>
      Close Prob: ${(account.close_probability * 100).toFixed(0)}%
    `)
    .addTo(STATE.accountLayer);
    
    allPoints.push([account.lat, account.lng]);
  });
  
  // Show rep home bases
  STATE.reps.forEach((rep, idx) => {
    const color = TERRITORY_COLORS[idx % TERRITORY_COLORS.length];
    const repIcon = L.divIcon({
      className: 'rep-marker',
      html: `<div style="
        width: 24px; 
        height: 24px; 
        background: ${color}; 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">★</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    L.marker([rep.home_lat, rep.home_lng], { icon: repIcon })
      .bindPopup(`<strong>${rep.name}</strong><br>Max: ${rep.max_accounts} accounts`)
      .addTo(STATE.repLayer);
    
    allPoints.push([rep.home_lat, rep.home_lng]);
  });
  
  // Fit map and set bounds constraints
  if (allPoints.length > 0) {
    setMapBoundsFromPoints(allPoints);
  }
}

/**
 * Set map bounds with a buffer so users can't zoom out beyond the data area
 */
function setMapBoundsFromPoints(points) {
  // Calculate the bounding box
  const lats = points.map(p => p[0]);
  const lngs = points.map(p => p[1]);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  // Calculate the span
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  
  // Add 10% buffer on each side (so 20% total, allowing 5-10% zoom out)
  const buffer = 0.15;
  const bufferedBounds = L.latLngBounds(
    [minLat - latSpan * buffer, minLng - lngSpan * buffer],
    [maxLat + latSpan * buffer, maxLng + lngSpan * buffer]
  );
  
  // Store the data bounds for reference
  STATE.dataBounds = bufferedBounds;
  
  // Fit the map to the data with padding
  STATE.map.fitBounds(points, { padding: [30, 30] });
  
  // Get the zoom level after fitting
  const fitZoom = STATE.map.getZoom();
  
  // Set minimum zoom to be 1 level below the fitted zoom (allows slight zoom out)
  const minZoom = Math.max(1, Math.floor(fitZoom) - 1);
  STATE.map.setMinZoom(minZoom);
  
  // Set max bounds with the buffer - prevents panning too far
  STATE.map.setMaxBounds(bufferedBounds);
  
  // Store the ideal center for reset
  STATE.dataCenter = STATE.map.getCenter();
  STATE.dataZoom = fitZoom;
}

/**
 * Clear map bounds constraints (when switching scenarios or clearing data)
 */
function clearMapBoundsConstraints() {
  STATE.dataBounds = null;
  STATE.dataCenter = null;
  STATE.dataZoom = null;
  
  // Remove bounds constraints
  STATE.map.setMaxBounds(null);
  STATE.map.setMinZoom(1);
  
  // Clear layers
  STATE.territoryLayer.clearLayers();
  STATE.accountLayer.clearLayers();
  STATE.repLayer.clearLayers();
}

function runOptimization() {
  if (STATE.accounts.length === 0 || STATE.reps.length === 0) {
    alert('Please load account and rep data first.');
    return;
  }
  
  // Run selected algorithm
  const algorithms = {
    kmeans: runKMeans,
    greedy: runGreedy,
    voronoi: runVoronoi
  };
  
  const algorithm = algorithms[STATE.config.algorithm];
  STATE.territories = algorithm(STATE.accounts, STATE.reps, STATE.config);
  
  // Render results
  renderTerritories(STATE.territories);
  renderScorecard(STATE.territories.global_metrics);
  renderBreakdown(STATE.territories.territories);
  showExportSection();
}

// Manual drawing handlers
function handleDrawCreated(e) {
  const layer = e.layer;
  STATE.drawnItems.addLayer(layer);
  
  // Check if data is loaded
  if (STATE.accounts.length === 0 || STATE.reps.length === 0) {
    alert('Please load a scenario first! Use the dropdown in the Manual Draw section.');
    STATE.drawnItems.removeLayer(layer);
    return;
  }
  
  // Find accounts inside this polygon
  const polygon = layer.toGeoJSON();
  const accountsInside = STATE.accounts.filter(a => {
    const point = turf.point([a.lng, a.lat]);
    return turf.booleanPointInPolygon(point, polygon);
  });
  
  if (accountsInside.length === 0) {
    alert('No accounts found inside this area. Try drawing around the account markers.');
    STATE.drawnItems.removeLayer(layer);
    return;
  }
  
  // Count how many territories are already assigned to each rep
  const territoryCountsByRep = {};
  STATE.reps.forEach(r => {
    territoryCountsByRep[r.rep_id] = STATE.manualTerritories.filter(t => t.rep_id === r.rep_id).length;
  });
  
  // Build rep options with territory counts AND color indicators
  const repOptions = STATE.reps.map((r, i) => {
    const count = territoryCountsByRep[r.rep_id];
    const countLabel = count === 0 ? '(0 territories)' : 
                       count === 1 ? '(1 territory)' : 
                       `(${count} territories)`;
    const colorInfo = COLOR_LABELS[i % COLOR_LABELS.length];
    return `${colorInfo.emoji} ${i + 1}. ${r.name} [${colorInfo.name}] ${countLabel}`;
  }).join('\n');
  
  const choice = prompt(`Found ${accountsInside.length} accounts!\n\nAssign to which rep? (enter name or number)\nMatch the color on the map to the emoji below:\n\n${repOptions}`);
  
  if (choice) {
    // Try to find rep by number or name
    let rep = null;
    const num = parseInt(choice);
    if (!isNaN(num) && num >= 1 && num <= STATE.reps.length) {
      rep = STATE.reps[num - 1];
    } else {
      rep = STATE.reps.find(r => r.name.toLowerCase().includes(choice.toLowerCase()));
    }
    
    if (rep) {
      const color = TERRITORY_COLORS[STATE.reps.indexOf(rep) % TERRITORY_COLORS.length];
      layer.setStyle({ 
        color: color, 
        fillColor: color, 
        fillOpacity: 0.3,
        weight: 2
      });
      
      STATE.manualTerritories.push({
        rep_id: rep.rep_id,
        accounts: accountsInside.map(a => a.account_id),
        layer: layer
      });
      
      document.getElementById('score-manual').disabled = false;
      
      // Build status with rep coverage summary
      const repsWithTerritories = new Set(STATE.manualTerritories.map(t => t.rep_id));
      const repsWithout = STATE.reps.filter(r => !repsWithTerritories.has(r.rep_id));
      
      let statusText = `${STATE.manualTerritories.length} ${STATE.manualTerritories.length === 1 ? 'territory' : 'territories'} defined. `;
      if (repsWithout.length === 0) {
        statusText += `All ${STATE.reps.length} reps have territories! Click "Score My Territories" when ready.`;
      } else {
        statusText += `${repsWithout.length} rep${repsWithout.length === 1 ? '' : 's'} still need territories: ${repsWithout.map(r => r.name).join(', ')}`;
      }
      
      document.getElementById('manual-status').textContent = statusText;
    } else {
      alert('Rep not found. Please try again.');
      STATE.drawnItems.removeLayer(layer);
    }
  } else {
    STATE.drawnItems.removeLayer(layer);
  }
}

function clearDrawings() {
  STATE.drawnItems.clearLayers();
  STATE.manualTerritories = [];
  document.getElementById('score-manual').disabled = true;
  document.getElementById('manual-status').textContent = 'Draw polygons on the map to define territories.';
}

function scoreManualTerritories() {
  if (STATE.manualTerritories.length === 0) return;
  
  // Build territory result from manual assignments
  const centroids = STATE.reps.map((r, idx) => {
    const manual = STATE.manualTerritories.filter(t => t.rep_id === r.rep_id);
    const accountIds = manual.flatMap(t => t.accounts);
    const accounts = STATE.accounts.filter(a => accountIds.includes(a.account_id));
    
    return {
      lat: r.home_lat || r.lat,
      lng: r.home_lng || r.lng,
      rep: r,
      assigned: accounts
    };
  });
  
  const manualResult = buildTerritoryResult(centroids, STATE.accounts, STATE.reps);
  
  // Run the SELECTED algorithm for comparison (not just K-means)
  const algoName = STATE.config.algorithm;
  const algoDisplayNames = {
    'kmeans': 'Balanced K-Means',
    'greedy': 'Greedy Nearest Neighbor',
    'voronoi': 'Weighted Voronoi'
  };
  
  let algoResult;
  switch (algoName) {
    case 'greedy':
      algoResult = runGreedy(STATE.accounts, STATE.reps, STATE.config);
      break;
    case 'voronoi':
      algoResult = runVoronoi(STATE.accounts, STATE.reps, STATE.config);
      break;
    default:
      algoResult = runKMeans(STATE.accounts, STATE.reps, STATE.config);
  }
  
  // Calculate overall scores
  const manualOverall = Math.round((manualResult.global_metrics.balance_score + manualResult.global_metrics.travel_score + manualResult.global_metrics.revenue_score + manualResult.global_metrics.compactness_score) / 4);
  const algoOverall = Math.round((algoResult.global_metrics.balance_score + algoResult.global_metrics.travel_score + algoResult.global_metrics.revenue_score + algoResult.global_metrics.compactness_score) / 4);
  
  // Count unassigned accounts
  const assignedAccountIds = STATE.manualTerritories.flatMap(t => t.accounts);
  const unassignedCount = STATE.accounts.length - new Set(assignedAccountIds).size;
  
  // Show comparison section
  document.getElementById('comparison-section').classList.remove('hidden');
  
  // Add intro text
  document.getElementById('comparison-intro').innerHTML = `
    You drew <strong>${STATE.manualTerritories.length} territory polygon${STATE.manualTerritories.length > 1 ? 's' : ''}</strong> 
    covering <strong>${assignedAccountIds.length} accounts</strong>.
    ${unassignedCount > 0 ? `<span class="warning-text">(${unassignedCount} accounts left unassigned)</span>` : ''}
    Below, we compare your solution against the <strong>${algoDisplayNames[algoName]}</strong> algorithm.
  `;
  
  // Update algorithm subtitle
  document.getElementById('algo-subtitle').textContent = `Using ${algoDisplayNames[algoName]} algorithm`;
  
  // Build score comparison HTML with visual bars
  document.getElementById('manual-scores').innerHTML = buildScoreHTML(manualResult.global_metrics, manualOverall);
  document.getElementById('algorithm-scores').innerHTML = buildScoreHTML(algoResult.global_metrics, algoOverall);
  
  // Generate verdict
  const diff = manualOverall - algoOverall;
  let verdictHTML;
  if (diff > 5) {
    verdictHTML = `<div class="verdict verdict--win">🎉 <strong>Great job!</strong> Your territories scored ${diff}% higher than the algorithm! You found a better solution.</div>`;
  } else if (diff > -5) {
    verdictHTML = `<div class="verdict verdict--tie">🤝 <strong>Close match!</strong> Your territories are within ${Math.abs(diff)}% of the algorithm's solution. Both approaches work well for this scenario.</div>`;
  } else {
    verdictHTML = `<div class="verdict verdict--lose">📊 <strong>Room for improvement.</strong> The algorithm found a solution that scores ${Math.abs(diff)}% higher. Try adjusting your territory boundaries to improve balance or reduce travel distances.</div>`;
  }
  document.getElementById('comparison-verdict').innerHTML = verdictHTML;
  
  // Update scorecard with manual results
  renderScorecard(manualResult.global_metrics);
  renderBreakdown(manualResult.territories);
}

function buildScoreHTML(metrics, overall) {
  return `
    <div class="score-row"><span class="score-name">Balance</span><span class="score-val">${metrics.balance_score}%</span></div>
    <div class="score-row"><span class="score-name">Travel Efficiency</span><span class="score-val">${metrics.travel_score}%</span></div>
    <div class="score-row"><span class="score-name">Revenue Alignment</span><span class="score-val">${metrics.revenue_score}%</span></div>
    <div class="score-row"><span class="score-name">Compactness</span><span class="score-val">${metrics.compactness_score}%</span></div>
    <div class="score-row score-row--total"><span class="score-name">Overall Score</span><span class="score-val score-val--big">${overall}%</span></div>
  `;
}

// Template downloads
function downloadAccountsTemplate() {
  const csv = `account_id,name,lat,lng,annual_potential,close_probability,industry
A001,Acme Corp,40.7128,-74.0060,125000,0.35,Manufacturing
A002,TechStart Inc,40.7589,-73.9851,45000,0.72,Technology
A003,Metro Health,40.6892,-73.9442,80000,0.50,Healthcare`;
  
  downloadFile('accounts_template.csv', csv);
}

function downloadRepsTemplate() {
  const csv = `rep_id,name,home_lat,home_lng,max_accounts,max_travel_miles,effectiveness
R001,Sarah Chen,40.7484,-73.9857,25,50,1.15
R002,Mike Johnson,40.6892,-74.0445,30,75,0.92
R003,Lisa Park,40.7589,-73.8500,28,60,1.10`;
  
  downloadFile('reps_template.csv', csv);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export functions
function exportAssignments() {
  if (!STATE.territories) {
    alert('Run optimization first.');
    return;
  }
  
  let csv = 'account_id,account_name,rep_id,rep_name,annual_potential,close_probability\n';
  
  STATE.territories.territories.forEach(territory => {
    const accounts = STATE.accounts.filter(a => territory.accounts.includes(a.account_id));
    accounts.forEach(a => {
      csv += `${a.account_id},"${a.name}",${territory.rep_id},"${territory.rep_name}",${a.annual_potential},${a.close_probability}\n`;
    });
  });
  
  downloadFile('territory_assignments.csv', csv);
}

function exportMap() {
  // Use Leaflet's built-in functionality or html2canvas
  alert('Map export coming soon. For now, use your browser\'s screenshot functionality.');
}

function copySummary() {
  if (!STATE.territories) {
    alert('Run optimization first.');
    return;
  }
  
  const m = STATE.territories.global_metrics;
  const summary = `Territory Optimization Summary
==============================
Algorithm: ${STATE.config.algorithm}
Accounts: ${m.total_accounts}
Reps: ${STATE.reps.length}

Scores:
- Balance: ${m.balance_score}%
- Travel Efficiency: ${m.travel_score}%
- Revenue Alignment: ${m.revenue_score}%
- Compactness: ${m.compactness_score}%

Territory Breakdown:
${STATE.territories.territories.map(t => 
  `${t.rep_name}: ${t.metrics.account_count} accounts, ${formatCurrency(t.metrics.total_potential)} potential`
).join('\n')}`;
  
  navigator.clipboard.writeText(summary).then(() => {
    alert('Summary copied to clipboard!');
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
  initializeEventHandlers();
});
