// Perceptual Positioning Lab - Pre-built Marketing Scenarios
// Each scenario includes perceptual data and optional preference data

// Helper: Generate preferences with high variance for interesting scatter
function generateHighVariancePreferences(brands, n, segmentProfiles, segmentLabels, segmentColumn, segmentDistribution = [0.35, 0.70]) {
  const customers = [];
  const predefinedSegments = [];
  
  for (let i = 0; i < n; i++) {
    // Segment assignment
    const rand = Math.random();
    let segmentIdx = rand < segmentDistribution[0] ? 0 : (rand < segmentDistribution[1] ? 1 : 2);
    
    // 15% chance of being a "segment crossover" - doesn't fit neatly
    const isCrossover = Math.random() < 0.15;
    if (isCrossover) {
      segmentIdx = Math.floor(Math.random() * 3);
    }
    
    // 8% chance of being an "outlier" with random preferences
    const isOutlier = Math.random() < 0.08;
    
    predefinedSegments.push(segmentIdx);
    
    if (isOutlier) {
      // Outliers have completely independent random preferences
      const prefs = brands.map(() => {
        return 1 + Math.random() * 8; // Full 1-9 range
      });
      customers.push(prefs);
      continue;
    }
    
    // Customer variation parameters - much wider ranges
    const extremity = 0.1 + Math.random() * 0.9; // 0.1 to 1.0 (wider range)
    const personalBias = (Math.random() - 0.5) * 5; // -2.5 to +2.5 (bigger!)
    const responseBias = (Math.random() - 0.5) * 2; // Some rate everything higher/lower
    
    // Per-brand noise - MUCH higher variance
    const brandNoise = () => (Math.random() - 0.5) * 4; // -2 to +2
    
    // Occasionally flip preferences (5% chance per brand)
    const flipChance = 0.05;
    
    const profile = segmentProfiles[segmentIdx];
    const prefs = [];
    
    brands.forEach(brand => {
      let rating;
      const noise = brandNoise();
      const flip = Math.random() < flipChance;
      
      // Determine base rating from profile
      let isLoved = profile.loved.includes(brand);
      let isLiked = profile.liked.includes(brand);
      let isDisliked = profile.disliked.includes(brand);
      
      // Flip reverses the preference
      if (flip) {
        if (isLoved) {
          isLoved = false;
          isDisliked = true;
        } else if (isDisliked) {
          isDisliked = false;
          isLiked = true;
        }
      }
      
      if (isLoved) {
        // Loved: base 5.5-9 range
        rating = 5.5 + extremity * 3 + personalBias * 0.5 + responseBias + noise;
      } else if (isLiked) {
        // Liked: base 4-8 range
        rating = 4.5 + extremity * 2.5 + personalBias * 0.4 + responseBias + noise;
      } else if (isDisliked) {
        // Disliked: base 1-5 range
        rating = 4.5 - extremity * 3 - personalBias * 0.5 + responseBias + noise;
      } else {
        // Neutral: widest spread possible 2-8
        rating = 5 + personalBias * 0.6 + responseBias + noise * 1.5;
      }
      
      prefs.push(Math.max(1, Math.min(9, rating)));
    });
    
    customers.push(prefs);
  }
  
  return { 
    brands, 
    customers,
    predefinedSegments,
    segmentLabels,
    segmentColumn
  };
}

const MDS_SCENARIOS = [
  
  // ==================== BEER BRANDS ====================
  {
    id: 'beer-brands',
    label: '🍺 Beer Brand Positioning',
    
    description: function() {
      return `
        <p><strong>Beer Brand Positioning Study</strong></p>
        <p>This scenario illustrates how perceptual positioning reveals competitive structure in a mature 
        consumer goods market. Compare 10 major beer brands across 12 perceptual attributes.</p>
        
        <details class="interpretation-aid">
          <summary>💡 Learning Objectives</summary>
          <ul>
            <li>Identify the key perceptual dimensions that differentiate beer brands (likely: Premium/Craft vs. Mass Market and Imported/Sophisticated vs. Domestic/Traditional)</li>
            <li>Understand how customer segments differ in their ideal brand preferences</li>
            <li>Explore "white space" opportunities where no current brand competes effectively</li>
            <li>Simulate how repositioning (e.g., Budweiser moving toward "craft") would shift market share</li>
          </ul>
        </details>
        
        <p><strong>Data included:</strong></p>
        <ul>
          <li><strong>Brands:</strong> Budweiser, Miller, Coors, Corona, Heineken, Sam Adams, Blue Moon, Stella Artois, Modelo, PBR</li>
          <li><strong>Attributes:</strong> Premium, Refreshing, Smooth, Full-bodied, Craft quality, Imported appeal, and 6 more</li>
          <li><strong>Preference data:</strong> 400 simulated customers in 3 segments (Premium seekers, Value seekers, Lifestyle seekers)</li>
          <li><strong>Usage weights:</strong> Consumption rate data (Value seekers drink 2x more than Premium seekers)</li>
        </ul>
      `;
    },
    
    generate: function() {
      const brands = ['Budweiser', 'Miller', 'Coors', 'Corona', 'Heineken', 'Sam Adams', 'Blue Moon', 'Stella Artois', 'Modelo', 'PBR'];
      const attributes = [
        'Premium/Expensive',
        'Refreshing',
        'Smooth taste',
        'Full-bodied',
        'Good with food',
        'Social/Party',
        'Craft quality',
        'Imported appeal',
        'Value for money',
        'Widely available',
        'Trendy/Hip',
        'Traditional/Classic'
      ];
      
      // Perceptual ratings (1-7 scale)
      const matrix = [
        // Premium: Sam Adams, Stella high; PBR, Miller low
        [3.5, 3.0, 3.2, 4.5, 5.2, 5.8, 5.5, 6.2, 4.8, 1.8],
        // Refreshing: Corona, Coors high
        [4.2, 4.5, 5.2, 6.0, 4.8, 3.8, 4.2, 4.5, 4.8, 4.0],
        // Smooth: Blue Moon, Stella high
        [4.0, 4.2, 4.5, 4.8, 5.0, 4.2, 5.8, 5.5, 4.5, 3.5],
        // Full-bodied: Sam Adams, Blue Moon high
        [3.8, 3.2, 3.0, 3.5, 4.2, 5.8, 5.5, 5.0, 4.0, 3.0],
        // Good with food: Stella, Modelo, Heineken high
        [3.5, 3.2, 3.0, 5.5, 5.8, 5.0, 5.2, 6.0, 5.8, 2.5],
        // Social/Party: Budweiser, Corona, Miller high
        [5.5, 5.8, 5.2, 5.8, 4.5, 3.8, 4.0, 4.2, 4.5, 5.0],
        // Craft quality: Sam Adams, Blue Moon high
        [2.5, 2.0, 2.2, 3.5, 4.0, 6.5, 6.2, 5.0, 3.8, 2.0],
        // Imported appeal: Corona, Heineken, Stella, Modelo high
        [1.5, 1.5, 1.5, 6.5, 6.5, 2.5, 3.0, 6.2, 6.0, 1.5],
        // Value for money: PBR high; imports low
        [4.5, 5.0, 5.2, 3.5, 3.0, 4.0, 4.2, 2.8, 4.0, 6.5],
        // Widely available: Big 3 high
        [6.5, 6.2, 6.0, 5.5, 5.2, 4.5, 4.8, 4.5, 5.0, 5.5],
        // Trendy/Hip: Craft and imports high
        [2.5, 2.0, 2.5, 5.5, 5.0, 5.0, 5.8, 5.5, 5.2, 4.5],
        // Traditional/Classic: Big 3, Heineken high
        [5.5, 5.0, 5.2, 4.0, 5.5, 4.5, 3.0, 4.5, 4.5, 5.0]
      ];
      
      // Generate preference data (400 customers, 3 segments)
      const preferences = this.generateBeerPreferences(brands, 400);
      
      // Generate usage weights (heavy drinkers consume more)
      const weights = this.generateBeerUsageWeights(preferences);
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences,
        weights: weights
      };
    },
    
    // Generate usage rate weights based on segment
    // Premium seekers: moderate (0.8-1.2), Value seekers: heavy (1.2-2.5), Lifestyle: light (0.4-1.0)
    generateBeerUsageWeights: function(preferences) {
      const n = preferences.customers.length;
      const segments = preferences.predefinedSegments;
      const values = [];
      
      for (let i = 0; i < n; i++) {
        const segIdx = segments[i];
        let baseUsage;
        
        if (segIdx === 0) { // Premium seekers - moderate consumption
          baseUsage = 0.8 + Math.random() * 0.4; // 0.8-1.2
        } else if (segIdx === 1) { // Value seekers - heavy consumption
          baseUsage = 1.2 + Math.random() * 1.3; // 1.2-2.5
        } else { // Lifestyle seekers - light/social consumption
          baseUsage = 0.4 + Math.random() * 0.6; // 0.4-1.0
        }
        
        // Add individual variation
        const individualNoise = 0.8 + Math.random() * 0.4; // 0.8-1.2 multiplier
        values.push(parseFloat((baseUsage * individualNoise).toFixed(2)));
      }
      
      return { type: 'usage', values };
    },
    
    generateBeerPreferences: function(brands, n) {
      const segmentLabels = ['Premium Seekers', 'Value Seekers', 'Lifestyle Seekers'];
      
      const segmentProfiles = {
        0: { // Premium seekers - love craft/imports, dislike cheap domestics
          loved: ['Sam Adams', 'Blue Moon', 'Stella Artois', 'Heineken'],
          liked: ['Corona', 'Modelo'],
          disliked: ['PBR', 'Miller', 'Coors', 'Budweiser']
        },
        1: { // Value seekers - love cheap domestics, dislike expensive imports
          loved: ['PBR', 'Coors', 'Budweiser', 'Miller'],
          liked: ['Corona'],
          disliked: ['Stella Artois', 'Heineken', 'Sam Adams', 'Blue Moon']
        },
        2: { // Lifestyle seekers - love trendy/social brands
          loved: ['Corona', 'Blue Moon', 'Modelo'],
          liked: ['Stella Artois', 'Heineken'],
          disliked: ['PBR', 'Miller', 'Coors']
        }
      };
      
      return generateHighVariancePreferences(brands, n, segmentProfiles, segmentLabels, 'Customer_Type', [0.40, 0.75]);
    }
  },
  
  // ==================== SMARTPHONE BRANDS ====================
  {
    id: 'smartphones',
    label: '📱 Smartphone Manufacturers',
    
    description: function() {
      return `
        <p><strong>Smartphone Brand Positioning Study</strong></p>
        <p>This scenario demonstrates positioning analysis in a high-tech durable goods market 
        where innovation, status, and value perceptions drive consumer choice.</p>
        
        <details class="interpretation-aid">
          <summary>💡 Learning Objectives</summary>
          <ul>
            <li>Observe how Apple occupies a unique "premium + user-friendly" position</li>
            <li>Identify the value-focused segment dominated by Chinese manufacturers</li>
            <li>Explore whether Google's "best camera" positioning differentiates it from Apple</li>
            <li>Simulate: What if OnePlus moved toward premium positioning?</li>
          </ul>
        </details>
        
        <p><strong>Data included:</strong></p>
        <ul>
          <li><strong>Brands:</strong> Apple, Samsung, Google, OnePlus, Xiaomi, Motorola</li>
          <li><strong>Attributes:</strong> Innovation, Build Quality, Camera, Value, Status, etc.</li>
          <li><strong>Preference data:</strong> 300 customers in 3 segments (Premium, Value, Tech enthusiasts)</li>
          <li><strong>Spend weights:</strong> Annual device spending (Premium buyers: $800-1500, Budget: $200-500)</li>
        </ul>
      `;
    },
    
    generate: function() {
      const brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Motorola'];
      const attributes = [
        'Innovative',
        'Premium/Expensive',
        'Build quality',
        'Camera quality',
        'Value for money',
        'User friendly',
        'Status symbol',
        'Reliable/Durable',
        'Cutting edge tech',
        'Good customer support'
      ];
      
      const matrix = [
        // Innovative
        [6.5, 5.5, 6.2, 5.0, 4.5, 3.5],
        // Premium/Expensive
        [6.8, 5.8, 5.5, 4.5, 2.8, 3.0],
        // Build quality
        [6.5, 5.8, 5.5, 5.2, 4.0, 4.5],
        // Camera quality
        [6.2, 6.0, 6.8, 5.5, 4.5, 4.2],
        // Value for money
        [3.5, 4.5, 5.0, 6.2, 6.5, 6.0],
        // User friendly
        [6.8, 5.5, 6.0, 5.0, 4.5, 5.5],
        // Status symbol
        [6.8, 5.5, 4.5, 4.0, 2.5, 3.0],
        // Reliable
        [6.2, 5.5, 5.8, 5.0, 4.2, 5.0],
        // Cutting edge tech
        [5.5, 6.0, 6.5, 5.5, 5.0, 4.0],
        // Customer support
        [5.5, 4.5, 5.0, 4.0, 3.5, 4.5]
      ];
      
      const preferences = this.generatePhonePreferences(brands, 300);
      
      // Generate spend weights (annual device + accessory spend)
      const weights = this.generatePhoneSpendWeights(preferences);
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences,
        weights: weights
      };
    },
    
    // Generate spending data based on segment
    // Premium: $800-1500, Budget: $200-500, Tech enthusiasts: $600-1200
    generatePhoneSpendWeights: function(preferences) {
      const n = preferences.customers.length;
      const segments = preferences.predefinedSegments;
      const values = [];
      
      for (let i = 0; i < n; i++) {
        const segIdx = segments[i];
        let baseSpend;
        
        if (segIdx === 0) { // Premium buyers - high spend
          baseSpend = 800 + Math.random() * 700; // $800-1500
        } else if (segIdx === 1) { // Budget conscious - low spend
          baseSpend = 200 + Math.random() * 300; // $200-500
        } else { // Tech enthusiasts - moderate-high spend
          baseSpend = 600 + Math.random() * 600; // $600-1200
        }
        
        // Add individual variation (+/- 15%)
        const individualNoise = 0.85 + Math.random() * 0.3;
        values.push(Math.round(baseSpend * individualNoise));
      }
      
      return { type: 'spend', values };
    },
    
    generatePhonePreferences: function(brands, n) {
      const segmentLabels = ['Premium Buyers', 'Budget Conscious', 'Tech Enthusiasts'];
      
      const segmentProfiles = {
        0: { // Premium buyers - love Apple/Samsung, dislike budget brands
          loved: ['Apple', 'Samsung'],
          liked: ['Google'],
          disliked: ['Xiaomi', 'Motorola', 'OnePlus']
        },
        1: { // Budget conscious - love value brands, dislike premium
          loved: ['Xiaomi', 'Motorola', 'OnePlus'],
          liked: ['Samsung'],
          disliked: ['Apple']
        },
        2: { // Tech enthusiasts - love innovation leaders
          loved: ['Google', 'OnePlus'],
          liked: ['Apple', 'Samsung', 'Xiaomi'],
          disliked: ['Motorola']
        }
      };
      
      return generateHighVariancePreferences(brands, n, segmentProfiles, segmentLabels, 'Buyer_Type');
    }
  },
  
  // ==================== STREAMING SERVICES ====================
  {
    id: 'streaming',
    label: '🎬 Streaming Services',
    
    description: function() {
      return `
        <p><strong>Streaming Service Positioning Study</strong></p>
        <p>Compare major video streaming platforms on content and experience dimensions.</p>
        <ul>
          <li><strong>Brands:</strong> Netflix, Disney+, HBO Max, Amazon Prime, Hulu, Apple TV+</li>
          <li><strong>Attributes:</strong> Original Content, Library Size, Value, etc.</li>
          <li><strong>Preference data:</strong> 180 simulated customers</li>
        </ul>
        <p><em>See how platforms differentiate on content quality vs. quantity and family vs. adult content.</em></p>
      `;
    },
    
    generate: function() {
      const brands = ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Hulu', 'Apple TV+'];
      const attributes = [
        'Original content quality',
        'Content library size',
        'Value for price',
        'Family friendly',
        'Premium/Prestige content',
        'Easy to use',
        'Binge-worthy shows',
        'Movie selection',
        'Live/Current content',
        'Tech quality (4K/HDR)'
      ];
      
      const matrix = [
        // Original content quality
        [6.5, 5.0, 6.8, 4.5, 4.8, 6.2],
        // Library size
        [6.8, 4.5, 5.0, 6.5, 5.5, 3.5],
        // Value for price
        [5.0, 5.5, 4.5, 6.5, 5.8, 4.0],
        // Family friendly
        [4.5, 6.8, 4.0, 5.0, 5.0, 5.5],
        // Premium/Prestige
        [5.5, 4.5, 6.8, 4.0, 4.5, 6.5],
        // Easy to use
        [6.2, 6.0, 5.0, 5.0, 5.5, 6.5],
        // Binge-worthy
        [6.8, 4.5, 6.2, 5.0, 5.5, 4.5],
        // Movie selection
        [5.5, 6.0, 6.5, 5.5, 4.5, 5.5],
        // Live/Current
        [3.5, 4.0, 5.0, 4.5, 6.5, 3.0],
        // Tech quality
        [6.0, 6.0, 5.5, 5.5, 5.0, 6.8]
      ];
      
      const preferences = this.generateStreamingPreferences(brands, 350);
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences
      };
    },
    
    generateStreamingPreferences: function(brands, n) {
      const segmentLabels = ['Family Households', 'Binge Watchers', 'Quality Seekers'];
      
      const segmentProfiles = {
        0: { // Family households - love family-friendly, dislike adult content
          loved: ['Disney+', 'Amazon Prime'],
          liked: ['Netflix', 'Apple TV+'],
          disliked: ['HBO Max']
        },
        1: { // Binge watchers - love content volume
          loved: ['Netflix', 'HBO Max'],
          liked: ['Amazon Prime', 'Hulu'],
          disliked: ['Apple TV+', 'Disney+']
        },
        2: { // Quality seekers - love prestige content
          loved: ['HBO Max', 'Apple TV+'],
          liked: ['Netflix'],
          disliked: ['Hulu', 'Amazon Prime']
        }
      };
      
      return generateHighVariancePreferences(brands, n, segmentProfiles, segmentLabels, 'Viewer_Type', [0.35, 0.75]);
    }
  },
  
  // ==================== FAST FOOD CHAINS ====================
  {
    id: 'fast-food',
    label: '🍔 Fast Food Chains',
    
    description: function() {
      return `
        <p><strong>Fast Food Restaurant Positioning Study</strong></p>
        <p>Analyze how major fast food chains are perceived by consumers.</p>
        <ul>
          <li><strong>Brands:</strong> McDonald's, Burger King, Wendy's, Chick-fil-A, Five Guys, Shake Shack, In-N-Out</li>
          <li><strong>Attributes:</strong> Food Quality, Speed, Value, Healthy Options, etc.</li>
          <li><strong>Preference data:</strong> 160 simulated customers</li>
        </ul>
        <p><em>Explore the quality/speed tradeoff and fast-casual positioning.</em></p>
      `;
    },
    
    generate: function() {
      const brands = ['McDonald\'s', 'Burger King', 'Wendy\'s', 'Chick-fil-A', 'Five Guys', 'Shake Shack', 'In-N-Out'];
      const attributes = [
        'Food quality',
        'Speed of service',
        'Value for money',
        'Healthy options',
        'Menu variety',
        'Cleanliness',
        'Consistent quality',
        'Fresh ingredients',
        'Friendly service',
        'Convenient locations'
      ];
      
      const matrix = [
        // Food quality
        [4.0, 3.5, 4.5, 5.8, 6.2, 6.5, 6.5],
        // Speed
        [6.0, 5.5, 5.0, 4.8, 4.0, 4.5, 5.5],
        // Value
        [5.5, 5.8, 5.5, 4.5, 3.5, 3.5, 5.5],
        // Healthy
        [3.0, 3.0, 4.0, 4.5, 3.5, 4.0, 4.5],
        // Variety
        [6.0, 5.5, 5.5, 4.0, 3.5, 4.0, 3.5],
        // Cleanliness
        [4.5, 4.0, 5.0, 6.5, 5.5, 6.0, 6.5],
        // Consistent
        [5.5, 5.0, 5.0, 6.0, 5.5, 5.5, 6.5],
        // Fresh
        [3.5, 3.5, 5.0, 5.5, 6.5, 6.0, 6.8],
        // Friendly
        [4.0, 4.0, 4.5, 6.5, 5.5, 5.5, 6.0],
        // Convenient
        [6.8, 6.0, 5.5, 5.0, 4.0, 3.5, 4.0]
      ];
      
      const preferences = this.generateFastFoodPreferences(brands, 320);
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences
      };
    },
    
    generateFastFoodPreferences: function(brands, n) {
      const segmentLabels = ['Quality Seekers', 'Value Hunters', 'Experience Seekers'];
      
      const segmentProfiles = {
        0: { // Quality seekers - love premium fast-casual
          loved: ['Five Guys', 'Shake Shack', 'In-N-Out', 'Chick-fil-A'],
          liked: ['Wendy\'s'],
          disliked: ['McDonald\'s', 'Burger King']
        },
        1: { // Value hunters - love affordable convenience
          loved: ['McDonald\'s', 'Burger King', 'Wendy\'s'],
          liked: ['Chick-fil-A'],
          disliked: ['Shake Shack', 'Five Guys']
        },
        2: { // Experience seekers - love cult favorites
          loved: ['Chick-fil-A', 'In-N-Out'],
          liked: ['Shake Shack', 'Five Guys'],
          disliked: ['Burger King']
        }
      };
      
      return generateHighVariancePreferences(brands, n, segmentProfiles, segmentLabels, 'Diner_Type', [0.35, 0.70]);
    }
  },
  
  // ==================== ATHLETIC FOOTWEAR ====================
  {
    id: 'athletic-shoes',
    label: '👟 Athletic Footwear',
    
    description: function() {
      return `
        <p><strong>Athletic Shoe Brand Positioning Study</strong></p>
        <p>Compare major athletic footwear brands on performance and style dimensions.</p>
        <ul>
          <li><strong>Brands:</strong> Nike, Adidas, New Balance, Under Armour, Puma, Reebok, ASICS, Brooks</li>
          <li><strong>Attributes:</strong> Performance, Style, Comfort, Innovation, etc.</li>
          <li><strong>Preference data:</strong> 140 simulated customers</li>
        </ul>
        <p><em>Discover fashion vs. function positioning and the running specialist niche.</em></p>
      `;
    },
    
    generate: function() {
      const brands = ['Nike', 'Adidas', 'New Balance', 'Under Armour', 'Puma', 'Reebok', 'ASICS', 'Brooks'];
      const attributes = [
        'Performance/Function',
        'Stylish/Fashionable',
        'Comfort',
        'Durability',
        'Innovation',
        'Value for money',
        'Athlete endorsed',
        'Running specific',
        'Casual wear suitable',
        'Status/Prestige'
      ];
      
      const matrix = [
        // Performance
        [6.5, 5.8, 5.5, 6.2, 5.0, 5.0, 6.5, 6.8],
        // Stylish
        [6.8, 6.5, 4.5, 5.0, 6.0, 4.5, 4.0, 3.5],
        // Comfort
        [5.8, 5.5, 6.5, 5.5, 5.0, 5.0, 6.2, 6.5],
        // Durability
        [5.5, 5.5, 6.5, 5.8, 5.0, 5.0, 6.5, 6.5],
        // Innovation
        [6.5, 6.0, 5.0, 5.5, 5.0, 4.5, 5.5, 5.5],
        // Value
        [4.0, 4.5, 5.5, 5.0, 5.5, 5.5, 5.0, 5.0],
        // Athlete endorsed
        [6.8, 6.0, 5.0, 6.5, 5.5, 4.5, 5.0, 5.0],
        // Running specific
        [5.5, 5.0, 5.5, 5.0, 4.0, 4.5, 6.8, 6.8],
        // Casual wear
        [6.5, 6.5, 6.0, 5.0, 6.5, 5.5, 4.0, 3.0],
        // Status
        [6.5, 6.0, 4.5, 5.0, 5.0, 4.0, 4.0, 4.0]
      ];
      
      const preferences = this.generateShoePreferences(brands, 280);
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences
      };
    },
    
    generateShoePreferences: function(brands, n) {
      const segmentLabels = ['Fashion Forward', 'Serious Runners', 'Comfort Seekers'];
      
      const segmentProfiles = {
        0: { // Fashion forward - love stylish brands
          loved: ['Nike', 'Adidas', 'Puma'],
          liked: ['Reebok'],
          disliked: ['Brooks', 'ASICS', 'New Balance']
        },
        1: { // Serious runners - love performance specialists
          loved: ['ASICS', 'Brooks', 'Nike'],
          liked: ['New Balance', 'Under Armour'],
          disliked: ['Puma', 'Reebok']
        },
        2: { // Comfort seekers - love comfort and durability
          loved: ['New Balance', 'ASICS', 'Brooks'],
          liked: ['Nike', 'Adidas'],
          disliked: ['Puma']
        }
      };
      
      return generateHighVariancePreferences(brands, n, segmentProfiles, segmentLabels, 'Shopper_Type', [0.35, 0.70]);
    }
  }
  
];

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MDS_SCENARIOS;
}
