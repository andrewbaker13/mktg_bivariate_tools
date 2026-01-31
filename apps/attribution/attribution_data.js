// apps/attribution/attribution_data.js

// --- Seeded Random Generator (Mulberry32) ---
// Allows results to be deterministic if a seed is provided
class SeededRNG {
    constructor(seed) {
        // If no seed provided, pick a random one
        if (seed === undefined || seed === null) {
            this.seed = Math.floor(Math.random() * 2147483647);
        } else {
            // Hash string or use number
            if (typeof seed === 'string') {
                let h = 2166136261 >>> 0;
                for (let i = 0; i < seed.length; i++) {
                    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
                }
                this.seed = h >>> 0;
            } else {
                this.seed = seed >>> 0; 
            }
        }
    }

    // Call this to get a float (0 to 1)
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Global PRNG instance (will be re-initialized by main scripts)
let prng = new SeededRNG();

// --- Global Constants ---
const CHANNELS = ['search', 'social', 'displayA', 'displayB', 'email'];

const CHANNEL_NAMES = {
    'search': 'Paid Search',
    'social': 'Social',
    'displayA': 'Display (Ad A)',
    'displayB': 'Display (Ad B)',
    'email': 'Email',
    // Special states for Markov
    '(start)': 'Start',
    '(conversion)': 'Converted',
    '(null)': 'Lost / Null'
};

const COLORS = {
    'search': '#3b82f6',
    'social': '#ec4899',
    'displayA': '#f59e0b',
    'displayB': '#d97706',
    'email': '#10b981',
    // Markov Specific
    '(start)': '#94a3b8',
    '(conversion)': '#22c55e',
    '(null)': '#ef4444'
};

// --- Scenarios (Unified) ---
const SCENARIOS = {
    'linear': {
        baseWeights: { 'search': 5, 'social': 3, 'displayA': 0.6, 'displayB': 0.4, 'email': 2 },
        synergyFactor: 1.0, 
        maxPathLength: 3,
        description: `
            <div style="background:#f8fafc; padding:1rem; border-radius:8px; border-left:4px solid #3b82f6;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <span style="font-size:1.5rem;">🛒</span>
                    <h4 style="margin:0; color:#1e40af; font-weight:700;">Case A: Simple Widget Co.</h4>
                </div>
                
                <p><strong style="color:#1e40af;">Business Context:</strong> You're the marketing analyst for a direct-to-consumer company selling low-cost household items ($15-30 price point). The CMO believes purchases are <strong>impulse-driven</strong>—customers see one ad, click, and buy. She's skeptical that multi-touch attribution adds value and wants proof before investing in retargeting campaigns.</p>
                
                <p style="margin-top:0.75rem;"><strong style="color:#1e40af;">Marketing Structure:</strong></p>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.5rem;">
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Primary Channel</div>
                        <div style="color:#1e293b;">Paid Search (Brand + Competitors)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Supporting Channels</div>
                        <div style="color:#1e293b;">Social, Display A/B, Email</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Typical Journey</div>
                        <div style="color:#1e293b;">1-3 touches (short, direct)</div>
                    </div>
                </div>
                
                <div style="background:#dbeafe; padding:0.75rem; margin-top:1rem; border-radius:6px; font-size:0.9rem;">
                    <strong style="color:#1e40af;">🎯 Research Question:</strong> <em>Do channels contribute additively (linear independence) or is there evidence of synergy/substitution? If Search does 80% of the work alone, should we reallocate budget away from supporting channels?</em>
                </div>
            </div>
        `
    },
    'synergy': {
        baseWeights: { 'search': 3, 'social': 4, 'displayA': 1, 'displayB': 1, 'email': 3 },
        synergyFactor: 1.5,
        maxPathLength: 6,
        description: `
            <div style="background:#f8fafc; padding:1rem; border-radius:8px; border-left:4px solid #ec4899;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <span style="font-size:1.5rem;">✈️</span>
                    <h4 style="margin:0; color:#9f1239; font-weight:700;">Case B: Luxury Vacation Inc.</h4>
                </div>
                
                <p><strong style="color:#9f1239;">Business Context:</strong> You're the performance marketing director for a high-end travel company selling $5,000-15,000 vacation packages. The sales cycle is 30-90 days with an average of <strong>8-12 touchpoints</strong> before booking. Leadership believes the channels work as a <strong>"marketing ecosystem"</strong>—Social inspires wanderlust, Email nurtures consideration with itineraries, and Search captures high-intent bookings.</p>
                
                <p style="margin-top:0.75rem;"><strong style="color:#9f1239;">Marketing Structure:</strong></p>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.5rem;">
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Awareness</div>
                        <div style="color:#1e293b;">Social (Influencers, UGC)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Consideration</div>
                        <div style="color:#1e293b;">Email (Drip campaigns)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Decision</div>
                        <div style="color:#1e293b;">Search + Retargeting</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Typical Journey</div>
                        <div style="color:#1e293b;">4-6 touches (complex, layered)</div>
                    </div>
                </div>
                
                <div style="background:#fce7f3; padding:0.75rem; margin-top:1rem; border-radius:6px; font-size:0.9rem;">
                    <strong style="color:#9f1239;">🎯 Research Question:</strong> <em>Does the combination of channels create synergy (2+2=5)? Specifically, is a user who sees {Social + Email + Search} significantly more likely to convert than the sum of their individual effects would predict?</em>
                </div>
            </div>
        `
    },
    'overlap': {
        baseWeights: { 'search': 8, 'social': 6, 'displayA': 3, 'displayB': 3, 'email': 6 },
        synergyFactor: 0.6,
        maxPathLength: 5,
        description: `
            <div style="background:#f8fafc; padding:1rem; border-radius:8px; border-left:4px solid #f59e0b;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <span style="font-size:1.5rem;">👕</span>
                    <h4 style="margin:0; color:#b45309; font-weight:700;">Case C: Fast Fashion Outlet</h4>
                </div>
                
                <p><strong style="color:#b45309;">Business Context:</strong> You're the analytics lead for a fast fashion ecommerce brand running aggressive retargeting across all channels. The CFO is concerned about <strong>diminishing returns</strong>—customers are seeing 5-8 ads before purchase, but internal tests suggest users who see 2 ads convert at nearly the same rate as those who see 7. She wants to know if the marginal value of additional touches justifies the spend.</p>
                
                <p style="margin-top:0.75rem;"><strong style="color:#b45309;">Marketing Structure:</strong></p>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.5rem;">
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Acquisition</div>
                        <div style="color:#1e293b;">Search, Social (Prospecting)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Retargeting</div>
                        <div style="color:#1e293b;">Display A/B (Heavy Frequency)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Nurture</div>
                        <div style="color:#1e293b;">Email (Cart Abandonment)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Typical Journey</div>
                        <div style="color:#1e293b;">4-5 touches (heavy overlap)</div>
                    </div>
                </div>
                
                <div style="background:#fef3c7; padding:0.75rem; margin-top:1rem; border-radius:6px; font-size:0.9rem;">
                    <strong style="color:#b45309;">🎯 Research Question:</strong> <em>Are channels cannibalizing each other's credit? Does adding a 4th or 5th channel to a coalition meaningfully increase conversion rate, or is there saturation? Should we focus budget on 2-3 high-impact channels instead of spreading thin?</em>
                </div>
            </div>
        `
    },
    'dominance': {
        baseWeights: { 'search': 20, 'social': 1, 'displayA': 0.3, 'displayB': 0.2, 'email': 0.5 },
        synergyFactor: 1.05,
        maxPathLength: 2,
        description: `
            <div style="background:#f8fafc; padding:1rem; border-radius:8px; border-left:4px solid #10b981;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <span style="font-size:1.5rem;">🔧</span>
                    <h4 style="margin:0; color:#065f46; font-weight:700;">Case D: Emergency Plumber</h4>
                </div>
                
                <p><strong style="color:#065f46;">Business Context:</strong> You're the marketing manager for a local plumbing company serving emergency repairs (burst pipes, water heaters, sewer backups). The owner believes <strong>Search dominates everything</strong>—when a customer has an emergency, they Google "plumber near me" and call the top result. The company spends $2k/month on Social and Display for "brand awareness," but leadership questions if it drives actual calls.</p>
                
                <p style="margin-top:0.75rem;"><strong style="color:#065f46;">Marketing Structure:</strong></p>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.5rem;">
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Primary Channel</div>
                        <div style="color:#1e293b;">Search (Emergency Keywords)</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Brand Awareness</div>
                        <div style="color:#1e293b;">Social, Display, Email</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Typical Journey</div>
                        <div style="color:#1e293b;">1-2 touches (urgent, direct)</div>
                    </div>
                </div>
                
                <div style="background:#d1fae5; padding:0.75rem; margin-top:1rem; border-radius:6px; font-size:0.9rem;">
                    <strong style="color:#065f46;">🎯 Research Question:</strong> <em>Does the data support cutting non-Search channels? Are Social/Display creating any measurable lift in Search conversion rates ("brand halo"), or are they contributing zero marginal value? Should we reallocate their budget to more Search coverage?</em>
                </div>
            </div>
        `
    },
    'b2b': {
        baseWeights: { 'search': 12, 'social': 8, 'displayA': 2, 'displayB': 1, 'email': 6 },
        synergyFactor: 1.3,
        maxPathLength: 6,
        sampleSize: 2000, 
        channelLabels: {
            'search': 'AE Demo',
            'social': 'Trade Show',
            'email': 'Discovery Call',
            'displayA': 'Webinar',
            'displayB': 'Whitepaper'
        },
        description: `
             <div style="background:#f8fafc; padding:1rem; border-radius:8px; border-left:4px solid #6366f1;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <span style="font-size:1.5rem;">🏢</span>
                    <h4 style="margin:0; color:#4338ca; font-weight:700;">Case E: The 'Smarketing' War (B2B)</h4>
                </div>
                
                <p><strong style="color:#4338ca;">Business Context:</strong> You're analyzing a B2B Enterprise Software company ($50M ARR). Marketing and Sales are fighting over credit. Sales says <em>"We close the deals, marketing events are just parties."</em> Marketing says <em>"Without our Trade Shows and Webinars, you'd have no leads to call."</em></p>

                <div style="background:#e0e7ff; padding:0.75rem; margin:0.75rem 0; border-radius:6px; font-size:0.9rem; color:#3730a3;">
                    <strong style="display:block; margin-bottom:0.25rem;">ℹ️ System Update: Custom Channels Active</strong>
                    This scenario automatically renames the tool's standard channels to match the B2B sales cycle.
                </div>

                <p style="margin-top:0.75rem;"><strong style="color:#4338ca;">Funnel Structure:</strong></p>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.5rem;">
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Top of Funnel</div>
                        <div style="color:#1e293b;">Trade Shows & Webinars</div>
                    </div>
                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Bridge (Nurture)</div>
                        <div style="color:#1e293b;">Whitepapers & Discovery Calls</div>
                    </div>

                    <div style="background:#fff; padding:0.5rem; border-radius:4px; font-size:0.9rem;">
                        <div style="font-weight:600; color:#64748b;">Closing Event</div>
                        <div style="color:#1e293b;">AE Demo (The "Conversion")</div>
                    </div>
                </div>
                
                <div style="background:#eef2ff; padding:0.75rem; margin-top:1rem; border-radius:6px; font-size:0.9rem;">
                    <strong style="color:#4338ca;">🎯 Research Question:</strong> <em>Does the expensive <strong>Trade Show</strong> actually cause the <strong>AE Demo</strong> to happen? Or is the Sales team right that they are closing deals independently? Using Shapley, we can see exactly how much "Assist Value" the events team contributes.</em>
                </div>
            </div>
        `
    }
};

// --- Shared Helper: Weighted Transition Picker (Logic for Data Gen) ---
// Used by both tools to generate realistic paths
function pickWeightedTransition(transitions) {
    // transitions is array of { to: 'channel', prob: 0.4 }
    const r = Math.random();
    let sum = 0;
    for (let t of transitions) {
        sum += t.prob;
        if (r < sum) return t.to;
    }
    return transitions[transitions.length - 1].to; // Fallback
}
