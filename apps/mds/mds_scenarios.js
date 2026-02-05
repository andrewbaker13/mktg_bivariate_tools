// Perceptual Positioning Lab - Pre-built Marketing Scenarios
// Each scenario includes perceptual data and optional preference data

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
          <li><strong>Preference data:</strong> 200 simulated customers in 3 segments (Premium seekers, Value seekers, Lifestyle seekers)</li>
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
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences
      };
    },
    
    generateBeerPreferences: function(brands, n) {
      const customers = [];
      const predefinedSegments = [];
      const segmentLabels = ['Premium Seekers', 'Value Seekers', 'Lifestyle Seekers'];
      
      // Segment 1: Premium seekers (40%) - prefer craft/imports
      // Segment 2: Value seekers (35%) - prefer domestic mass market
      // Segment 3: Lifestyle seekers (25%) - prefer trendy/social brands
      
      // Define segment preference profiles (favorite brands get HIGH, others get LOW)
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
      
      for (let i = 0; i < n; i++) {
        // Segment assignment with some randomization (not perfectly ordered)
        const rand = Math.random();
        const segmentIdx = rand < 0.40 ? 0 : (rand < 0.75 ? 1 : 2);
        predefinedSegments.push(segmentIdx);
        
        // Customer "extremity" - how polarized are their preferences?
        // Wider range for more diversity: some very picky, some very flexible
        const extremity = 0.3 + Math.random() * 0.7; // 0.3 to 1.0
        
        // Customer-specific random offset (where they sit within their segment)
        // Larger range for more within-cluster spread
        const personalBias = (Math.random() - 0.5) * 3; // -1.5 to +1.5
        
        // Per-brand noise factor - each brand gets independent noise
        const brandNoise = () => (Math.random() - 0.5) * 2; // -1 to +1
        
        const profile = segmentProfiles[segmentIdx];
        const prefs = [];
        
        brands.forEach((brand) => {
          let rating;
          const noise = brandNoise();
          
          if (profile.loved.includes(brand)) {
            // Loved brands: 6-9 range with spread
            rating = 6 + extremity * 2.5 + personalBias * 0.4 + noise;
          } else if (profile.liked.includes(brand)) {
            // Liked brands: 4-7 range  
            rating = 4.5 + extremity * 2 + personalBias * 0.3 + noise;
          } else if (profile.disliked.includes(brand)) {
            // Disliked brands: 1-4 range
            rating = 4 - extremity * 2.5 - personalBias * 0.4 + noise;
          } else {
            // Neutral brands: 3-6 range
            rating = 4.5 + personalBias * 0.5 + noise * 1.5;
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
        segmentColumn: 'Customer_Type'
      };
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
          <li><strong>Preference data:</strong> 150 customers in 3 segments (Premium, Value, Tech enthusiasts)</li>
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
      
      return {
        perceptual: { brands, attributes, matrix },
        preferences: preferences
      };
    },
    
    generatePhonePreferences: function(brands, n) {
      const customers = [];
      const predefinedSegments = [];
      const segmentLabels = ['Premium Buyers', 'Budget Conscious', 'Tech Enthusiasts'];
      
      // Define segment preference profiles
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
      
      for (let i = 0; i < n; i++) {
        // Randomized segment assignment
        const rand = Math.random();
        const segmentIdx = rand < 0.35 ? 0 : (rand < 0.70 ? 1 : 2);
        predefinedSegments.push(segmentIdx);
        
        const extremity = 0.3 + Math.random() * 0.7;
        const personalBias = (Math.random() - 0.5) * 3;
        const brandNoise = () => (Math.random() - 0.5) * 2;
        
        const profile = segmentProfiles[segmentIdx];
        const prefs = [];
        
        brands.forEach(brand => {
          let rating;
          const noise = brandNoise();
          
          if (profile.loved.includes(brand)) {
            rating = 6 + extremity * 2.5 + personalBias * 0.4 + noise;
          } else if (profile.liked.includes(brand)) {
            rating = 4.5 + extremity * 2 + personalBias * 0.3 + noise;
          } else if (profile.disliked.includes(brand)) {
            rating = 4 - extremity * 2.5 - personalBias * 0.4 + noise;
          } else {
            rating = 4.5 + personalBias * 0.5 + noise * 1.5;
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
        segmentColumn: 'Buyer_Type'
      };
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
      const customers = [];
      const predefinedSegments = [];
      const segmentLabels = ['Family Households', 'Binge Watchers', 'Quality Seekers'];
      
      // Define segment preference profiles
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
      
      for (let i = 0; i < n; i++) {
        const rand = Math.random();
        const segmentIdx = rand < 0.35 ? 0 : (rand < 0.75 ? 1 : 2);
        predefinedSegments.push(segmentIdx);
        
        const extremity = 0.3 + Math.random() * 0.7;
        const personalBias = (Math.random() - 0.5) * 3;
        const brandNoise = () => (Math.random() - 0.5) * 2;
        const profile = segmentProfiles[segmentIdx];
        const prefs = [];
        
        brands.forEach(brand => {
          let rating;
          const noise = brandNoise();
          
          if (profile.loved.includes(brand)) {
            rating = 6 + extremity * 2.5 + personalBias * 0.4 + noise;
          } else if (profile.liked.includes(brand)) {
            rating = 4.5 + extremity * 2 + personalBias * 0.3 + noise;
          } else if (profile.disliked.includes(brand)) {
            rating = 4 - extremity * 2.5 - personalBias * 0.4 + noise;
          } else {
            rating = 4.5 + personalBias * 0.5 + noise * 1.5;
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
        segmentColumn: 'Viewer_Type'
      };
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
      const customers = [];
      const predefinedSegments = [];
      const segmentLabels = ['Quality Seekers', 'Value Hunters', 'Experience Seekers'];
      
      // Define segment preference profiles
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
      
      for (let i = 0; i < n; i++) {
        const rand = Math.random();
        const segmentIdx = rand < 0.35 ? 0 : (rand < 0.70 ? 1 : 2);
        predefinedSegments.push(segmentIdx);
        
        const extremity = 0.3 + Math.random() * 0.7;
        const personalBias = (Math.random() - 0.5) * 3;
        const brandNoise = () => (Math.random() - 0.5) * 2;
        const profile = segmentProfiles[segmentIdx];
        const prefs = [];
        
        brands.forEach(brand => {
          let rating;
          const noise = brandNoise();
          
          if (profile.loved.includes(brand)) {
            rating = 6 + extremity * 2.5 + personalBias * 0.4 + noise;
          } else if (profile.liked.includes(brand)) {
            rating = 4.5 + extremity * 2 + personalBias * 0.3 + noise;
          } else if (profile.disliked.includes(brand)) {
            rating = 4 - extremity * 2.5 - personalBias * 0.4 + noise;
          } else {
            rating = 4.5 + personalBias * 0.5 + noise * 1.5;
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
        segmentColumn: 'Diner_Type'
      };
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
      const customers = [];
      const predefinedSegments = [];
      const segmentLabels = ['Fashion Forward', 'Serious Runners', 'Comfort Seekers'];
      
      // Define segment preference profiles
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
      
      for (let i = 0; i < n; i++) {
        const rand = Math.random();
        const segmentIdx = rand < 0.35 ? 0 : (rand < 0.70 ? 1 : 2);
        predefinedSegments.push(segmentIdx);
        
        const extremity = 0.3 + Math.random() * 0.7;
        const personalBias = (Math.random() - 0.5) * 3;
        const brandNoise = () => (Math.random() - 0.5) * 2;
        const profile = segmentProfiles[segmentIdx];
        const prefs = [];
        
        brands.forEach(brand => {
          let rating;
          const noise = brandNoise();
          
          if (profile.loved.includes(brand)) {
            rating = 6 + extremity * 2.5 + personalBias * 0.4 + noise;
          } else if (profile.liked.includes(brand)) {
            rating = 4.5 + extremity * 2 + personalBias * 0.3 + noise;
          } else if (profile.disliked.includes(brand)) {
            rating = 4 - extremity * 2.5 - personalBias * 0.4 + noise;
          } else {
            rating = 4.5 + personalBias * 0.5 + noise * 1.5;
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
        segmentColumn: 'Shopper_Type'
      };
    }
  }
  
];

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MDS_SCENARIOS;
}
