// Scenario manifest for Marketing Resource Allocation Optimizer
const SCENARIO_MANIFEST = [
  {
    id: 'sales_team_travel',
    name: 'Sales Team Travel Budgets',
    description: `
      <div style="line-height: 1.6;">
        <p><strong>Challenge:</strong> Allocate travel budgets across 20 sales representatives to maximize new customer revenue.</p>
        
        <p><strong>The Scenario:</strong> Your company has <span style="color: #2a7de1; font-weight: bold;">$150,000</span> in annual travel budget. 
        Historical data reveals <strong>dramatic variation</strong> in rep effectiveness:</p>
        
        <ul style="margin-left: 1.5rem;">
          <li>🌟 <strong>Star performers</strong> (Davis, Garcia, Johnson, Smith, Quinn) generate <strong>$30-40 per travel dollar</strong></li>
          <li>⭐ <strong>Strong performers</strong> (Harris, Nelson, Owens, Lopez) generate <strong>$18-25 per dollar</strong></li>
          <li>📊 <strong>Average performers</strong> (Adams, Evans, Foster, Kim, Roberts, Martinez) generate <strong>$12-16 per dollar</strong></li>
          <li>📉 <strong>Weak performers</strong> (Chen, Ito, Parker, Taylor) generate only <strong>$4-8 per dollar</strong></li>
        </ul>
        
        <p><strong>Constraints:</strong> Each rep needs at least <strong>$2,000 for basics</strong> (local travel, meals), 
        but top performers could use up to <strong>$15,000 for national account visits</strong>.</p>
        
        <div style="background: #f0f7ff; padding: 1rem; border-left: 4px solid #2a7de1; margin-top: 1rem;">
          <p style="margin: 0;"><strong>🤔 Key Questions to Explore:</strong></p>
          <ul style="margin: 0.5rem 0 0 1.5rem;">
            <li>Should you fund all 20 reps equally, or concentrate spending on stars?</li>
            <li>At what point do even top performers hit diminishing returns?</li>
            <li>Is it worth keeping weak performers in the field at all?</li>
            <li>How would an equity constraint (max 10× ratio) change your allocation?</li>
          </ul>
        </div>
      </div>
    `,
    dataFile: 'scenarios/sales_team_travel.csv',
    suggestedConstraints: {
      totalBudget: 150000,
      minPerResource: 2000,
      maxPerResource: 15000,
      integerConstraint: true
    }
  },
  {
    id: 'social_media_influencers',
    name: 'Social Media Channel Allocation',
    description: `
      <div style="line-height: 1.6;">
        <p><strong>Challenge:</strong> Allocate advertising budget across 10 social media channels to maximize conversions.</p>
        
        <p><strong>The Scenario:</strong> You have <span style="color: #2a7de1; font-weight: bold;">$200,000</span> in digital ad budget. 
        But not all channels perform equally:</p>
        
        <ul style="margin-left: 1.5rem;">
          <li>🚀 <strong>Explosive growth</strong> (TikTok, Reddit) — 40-50× returns, hungry for budget</li>
          <li>📈 <strong>Steady performers</strong> (Instagram, YouTube, Snapchat) — 10-20× returns with saturation curves</li>
          <li>📊 <strong>Moderate ROI</strong> (LinkedIn, Twitter, Podcasts) — 8-12× returns, reliable but unexciting</li>
          <li>📉 <strong>Declining channels</strong> (Facebook Video, Pinterest) — 3-5× returns, hitting ceiling early</li>
        </ul>
        
        <p><strong>Real-world complexity:</strong> Some channels need <strong>$10,000+ minimums</strong> for effective campaigns (YouTube pre-roll), 
        while others work with <strong>$3,000 budgets</strong> (TikTok creator partnerships).</p>
        
        <div style="background: #fff3e0; padding: 1rem; border-left: 4px solid #ff9800; margin-top: 1rem;">
          <p style="margin: 0;"><strong>🎯 Strategic Decisions:</strong></p>
          <ul style="margin: 0.5rem 0 0 1.5rem;">
            <li>Do you spread budget across all 10 channels or focus on top performers?</li>
            <li>Try a <strong>cardinality constraint</strong> (max 6 channels) — does focus beat diversification?</li>
            <li>Instagram is saturating at $25K — should you cap it and reallocate to TikTok?</li>
            <li>Facebook shows weak returns but has your largest audience — risky to abandon?</li>
          </ul>
        </div>
      </div>
    `,
    dataFile: 'scenarios/social_media_influencers.csv',
    suggestedConstraints: {
      totalBudget: 200000,
      minPerResource: 5000,
      maxPerResource: 30000,
      cardinalityEnabled: true,
      maxResources: 8
    }
  },
  {
    id: 'regional_field_marketing',
    name: 'Regional Field Marketing Budgets',
    description: `
      <div style="line-height: 1.6;">
        <p><strong>Challenge:</strong> Distribute field marketing budgets across 12 U.S. regions to maximize lead generation.</p>
        
        <p><strong>The Scenario:</strong> You have <span style="color: #2a7de1; font-weight: bold;">$450,000</span> for field marketing 
        (events, local sponsorships, trade shows). But regional performance varies <strong>wildly</strong>:</p>
        
        <ul style="margin-left: 1.5rem;">
          <li>🏆 <strong>Mega markets</strong> (SoCal, MidAtlantic, Southeast) — 25-30× returns, massive potential</li>
          <li>🏙️ <strong>Major metros</strong> (Northeast, Pacific, Gulf Coast, Midwest) — 12-20× returns</li>
          <li>🏘️ <strong>Secondary markets</strong> (Southwest, NewEngland, GreatLakes) — 6-10× returns</li>
          <li>🏞️ <strong>Rural/sparse</strong> (Mountain, Plains) — 4-6× returns, limited opportunity</li>
        </ul>
        
        <p><strong>Political reality:</strong> Corporate policy requires:</p>
        <ul style="margin-left: 1.5rem;">
          <li>❌ No region gets <strong>less than 70% of historical budget</strong> (team morale, retention)</li>
          <li>⚖️ Max/min allocation ratio cannot exceed <strong>3:1</strong> (equity policy)</li>
        </ul>
        
        <div style="background: #f3e5f5; padding: 1rem; border-left: 4px solid #9c27b0; margin-top: 1rem;">
          <p style="margin: 0;"><strong>💼 Real-World Trade-offs:</strong></p>
          <ul style="margin: 0.5rem 0 0 1.5rem;">
            <li>Pure optimization says: "Dump everything into SoCal." Can you do that?</li>
            <li>Remove the equity constraint — how much more output could you generate?</li>
            <li>What if Plains region threatened to quit without 50% more budget?</li>
            <li>Try <strong>baseline deviation = 30%</strong> to limit disruption to existing plans</li>
          </ul>
        </div>
      </div>
    `,
    dataFile: 'scenarios/regional_field_marketing.csv',
    suggestedConstraints: {
      totalBudget: 450000,
      minPerResource: 20000,
      maxPerResource: 60000,
      equityEnabled: true,
      equityRatio: 3.0,
      baselineEnabled: true,
      baselineDeviation: 30
    }
  },
  {
    id: 'training_hours_quota',
    name: 'Sales Training Hours Allocation',
    description: `
      <div style="line-height: 1.6;">
        <p><strong>Challenge:</strong> Allocate training hours across 20 sales reps to maximize quota attainment.</p>
        
        <p><strong>The Scenario:</strong> You have <span style="color: #2a7de1; font-weight: bold;">600 total training hours</span> available 
        (instructor time + materials). Training improves performance, but reps vary <strong>enormously</strong> in learning ability:</p>
        
        <ul style="margin-left: 1.5rem;">
          <li>🎓 <strong>High aptitude</strong> (Olson, Quinn_T, Green, James) — <strong>$12,000-16,000 per hour</strong>, naturals who excel</li>
          <li>📚 <strong>Good learners</strong> (Lee, Stone, Anderson, Carter) — <strong>$6,000-10,000 per hour</strong></li>
          <li>📖 <strong>Average</strong> (Dixon, Ellis, Hughes, Moore, Ross) — <strong>$4,000-6,000 per hour</strong></li>
          <li>📝 <strong>Low aptitude</strong> (Brooks, Flynn, Nash, Park, Turner) — <strong>$1,500-3,000 per hour</strong>, limited impact</li>
        </ul>
        
        <p><strong>Constraints:</strong> Each rep needs <strong>minimum 10 hours for certification</strong>, 
        but additional training shows <strong>logarithmic returns</strong> after 50 hours (burnout, diminishing gains).</p>
        
        <div style="background: #e8f5e9; padding: 1rem; border-left: 4px solid #4caf50; margin-top: 1rem;">
          <p style="margin: 0;"><strong>🧠 Counterintuitive Insights to Discover:</strong></p>
          <ul style="margin: 0.5rem 0 0 1.5rem;">
            <li>Should you train <strong>stars</strong> (amplify strength) or <strong>strugglers</strong> (fix weakness)?</li>
            <li>At what point does more training become <strong>counterproductive</strong>?</li>
            <li>Compare: (A) equal 30hrs each vs (B) optimized allocation — how much lift?</li>
            <li>What if low-aptitude reps cost <strong>$100/hr</strong> but stars cost <strong>$500/hr</strong>? (Try variable costs!)</li>
            <li>Enable <strong>fixed costs = $5,000 per trained rep</strong> — does this change who gets trained?</li>
          </ul>
        </div>
      </div>
    `,
    dataFile: 'scenarios/training_hours_quota.csv',
    suggestedConstraints: {
      totalBudget: 600,
      minPerResource: 10,
      maxPerResource: 50,
      integerConstraint: true,
      equityEnabled: false
    }
  }
];

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SCENARIO_MANIFEST;
}
