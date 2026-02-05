// Perceptual Positioning Lab - Math Engine
// PCA, Eigendecomposition, Preference Modeling, K-Means Clustering

const MDSMath = (function() {
  
  // ==================== MATRIX OPERATIONS ====================
  
  /**
   * Transpose a matrix
   */
  function transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = [];
    
    for (let j = 0; j < cols; j++) {
      result[j] = [];
      for (let i = 0; i < rows; i++) {
        result[j][i] = matrix[i][j];
      }
    }
    return result;
  }
  
  /**
   * Matrix multiplication: A × B
   */
  function multiply(A, B) {
    const aRows = A.length;
    const aCols = A[0].length;
    const bCols = B[0].length;
    
    const result = [];
    for (let i = 0; i < aRows; i++) {
      result[i] = [];
      for (let j = 0; j < bCols; j++) {
        let sum = 0;
        for (let k = 0; k < aCols; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }
  
  /**
   * Compute mean of array
   */
  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  /**
   * Compute standard deviation
   */
  function std(arr) {
    const m = mean(arr);
    const variance = arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
  
  /**
   * Center matrix (subtract column means)
   */
  function centerMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    
    // Compute column means
    const colMeans = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let i = 0; i < rows; i++) {
        sum += matrix[i][j];
      }
      colMeans[j] = sum / rows;
    }
    
    // Subtract means
    const centered = [];
    for (let i = 0; i < rows; i++) {
      centered[i] = [];
      for (let j = 0; j < cols; j++) {
        centered[i][j] = matrix[i][j] - colMeans[j];
      }
    }
    
    return { centered, means: colMeans };
  }
  
  /**
   * Standardize matrix (center and divide by std)
   */
  function standardizeMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    
    // Compute column means and stds
    const colMeans = [];
    const colStds = [];
    
    for (let j = 0; j < cols; j++) {
      const col = [];
      for (let i = 0; i < rows; i++) {
        col.push(matrix[i][j]);
      }
      colMeans[j] = mean(col);
      colStds[j] = std(col);
      if (colStds[j] === 0) colStds[j] = 1; // Avoid division by zero
    }
    
    // Standardize
    const standardized = [];
    for (let i = 0; i < rows; i++) {
      standardized[i] = [];
      for (let j = 0; j < cols; j++) {
        standardized[i][j] = (matrix[i][j] - colMeans[j]) / colStds[j];
      }
    }
    
    return { standardized, means: colMeans, stds: colStds };
  }
  
  /**
   * Compute covariance matrix
   */
  function covarianceMatrix(matrix) {
    const { centered } = centerMatrix(matrix);
    const n = centered.length;
    const transposed = transpose(centered);
    const cov = multiply(transposed, centered);
    
    // Divide by n-1 for sample covariance
    for (let i = 0; i < cov.length; i++) {
      for (let j = 0; j < cov[0].length; j++) {
        cov[i][j] /= (n - 1);
      }
    }
    
    return cov;
  }
  
  /**
   * Compute correlation matrix
   */
  function correlationMatrix(matrix) {
    const { standardized } = standardizeMatrix(matrix);
    const n = standardized.length;
    const transposed = transpose(standardized);
    const corr = multiply(transposed, standardized);
    
    // Divide by n-1
    for (let i = 0; i < corr.length; i++) {
      for (let j = 0; j < corr[0].length; j++) {
        corr[i][j] /= (n - 1);
      }
    }
    
    return corr;
  }
  
  // ==================== EIGENDECOMPOSITION ====================
  // Using Jacobi algorithm for symmetric matrices
  
  /**
   * Eigendecomposition using Jacobi rotation method
   * Returns eigenvalues and eigenvectors sorted by eigenvalue (descending)
   */
  function eigenDecomposition(matrix, maxIterations = 100, tolerance = 1e-10) {
    const n = matrix.length;
    
    // Clone matrix (will be modified)
    const A = matrix.map(row => [...row]);
    
    // Initialize eigenvectors as identity matrix
    const V = [];
    for (let i = 0; i < n; i++) {
      V[i] = [];
      for (let j = 0; j < n; j++) {
        V[i][j] = (i === j) ? 1 : 0;
      }
    }
    
    // Jacobi rotations
    for (let iter = 0; iter < maxIterations; iter++) {
      // Find largest off-diagonal element
      let maxVal = 0;
      let p = 0, q = 1;
      
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(A[i][j]) > maxVal) {
            maxVal = Math.abs(A[i][j]);
            p = i;
            q = j;
          }
        }
      }
      
      // Check convergence
      if (maxVal < tolerance) break;
      
      // Compute rotation angle
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      
      // Apply rotation to A
      const app = A[p][p];
      const aqq = A[q][q];
      const apq = A[p][q];
      
      A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      A[p][q] = A[q][p] = 0;
      
      for (let i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          const aip = A[i][p];
          const aiq = A[i][q];
          A[i][p] = A[p][i] = c * aip - s * aiq;
          A[i][q] = A[q][i] = s * aip + c * aiq;
        }
      }
      
      // Apply rotation to V (eigenvectors)
      for (let i = 0; i < n; i++) {
        const vip = V[i][p];
        const viq = V[i][q];
        V[i][p] = c * vip - s * viq;
        V[i][q] = s * vip + c * viq;
      }
    }
    
    // Extract eigenvalues from diagonal
    const eigenvalues = [];
    for (let i = 0; i < n; i++) {
      eigenvalues.push(A[i][i]);
    }
    
    // Sort by eigenvalue (descending)
    const indices = eigenvalues.map((_, i) => i);
    indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);
    
    const sortedEigenvalues = indices.map(i => eigenvalues[i]);
    const sortedEigenvectors = [];
    
    for (let i = 0; i < n; i++) {
      sortedEigenvectors[i] = indices.map(j => V[i][j]);
    }
    
    return {
      eigenvalues: sortedEigenvalues,
      eigenvectors: sortedEigenvectors
    };
  }
  
  // ==================== PRINCIPAL COMPONENT ANALYSIS ====================
  
  /**
   * Center matrix (subtract column means, but do NOT divide by std)
   */
  function centerMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    
    // Compute column means
    const colMeans = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let i = 0; i < rows; i++) {
        sum += matrix[i][j];
      }
      colMeans[j] = sum / rows;
    }
    
    // Center only (no scaling)
    const centered = [];
    for (let i = 0; i < rows; i++) {
      centered[i] = [];
      for (let j = 0; j < cols; j++) {
        centered[i][j] = matrix[i][j] - colMeans[j];
      }
    }
    
    return { centered, means: colMeans };
  }
  
  /**
   * Perform PCA on perceptual data
   * 
   * @param {number[][]} matrix - Attributes × Brands matrix of ratings
   * @param {string[]} brands - Brand names
   * @param {string[]} attributes - Attribute names
   * @param {Object} options - Optional settings
   * @param {boolean} options.standardize - If true, use z-scores (correlation matrix). If false, use raw centered data (covariance matrix). Default: false.
   * @returns {Object} PCA results
   */
  function performPCA(matrix, brands, attributes, options = {}) {
    const standardize = options.standardize || false;
    
    // Transpose to Brands × Attributes for PCA
    const brandMatrix = transpose(matrix);
    
    // Either standardize (z-scores, correlation matrix) or just center (covariance matrix)
    let preparedData, analysisMatrix;
    if (standardize) {
      // Standardize: use correlation matrix (all attributes weighted equally)
      const { standardized } = standardizeMatrix(brandMatrix);
      preparedData = standardized;
      analysisMatrix = correlationMatrix(brandMatrix);
    } else {
      // Center only: use covariance matrix (attributes with larger variance have more influence)
      const { centered } = centerMatrix(brandMatrix);
      preparedData = centered;
      analysisMatrix = covarianceMatrix(brandMatrix);
    }
    
    // Eigendecomposition
    const { eigenvalues, eigenvectors } = eigenDecomposition(analysisMatrix);
    
    // Calculate variance explained
    const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
    const varianceExplained = eigenvalues.map(ev => ev / totalVariance);
    
    // Cumulative variance
    const cumulativeVariance = [];
    let cumSum = 0;
    for (let i = 0; i < varianceExplained.length; i++) {
      cumSum += varianceExplained[i];
      cumulativeVariance.push(cumSum);
    }
    
    // Project brands onto principal components (factor scores)
    const transposedEigenvectors = transpose(eigenvectors);
    const brandScores = multiply(preparedData, transposedEigenvectors);
    
    // Create brand coordinates object
    const brandCoords = {};
    brands.forEach((brand, i) => {
      brandCoords[brand] = [
        brandScores[i][0],
        brandScores[i][1],
        brandScores[i][2] || 0
      ];
    });
    
    // Attribute loadings (correlations between original vars and PCs)
    // Loading = eigenvector * sqrt(eigenvalue)
    const attrLoadings = [];
    for (let i = 0; i < attributes.length; i++) {
      const loading = [];
      for (let j = 0; j < Math.min(3, eigenvalues.length); j++) {
        loading.push(eigenvectors[i][j] * Math.sqrt(Math.abs(eigenvalues[j])));
      }
      attrLoadings.push(loading);
    }
    
    return {
      brandCoords,
      attrLoadings,
      eigenvalues,
      varianceExplained,
      cumulativeVariance
    };
  }
  
  // ==================== K-MEANS CLUSTERING ====================
  
  /**
   * K-Means clustering for customer segmentation
   * 
   * @param {number[][]} data - Customer × Brand preference matrix
   * @param {number} k - Number of clusters
   * @param {number} maxIter - Maximum iterations
   * @returns {Object} Clustering results
   */
  function kMeansCluster(data, k, maxIter = 100) {
    const n = data.length;
    const dims = data[0].length;
    
    // Initialize centroids using k-means++ style
    const centroids = initializeCentroids(data, k);
    
    let assignments = new Array(n).fill(0);
    let prevAssignments = new Array(n).fill(-1);
    
    for (let iter = 0; iter < maxIter; iter++) {
      // Check convergence
      if (assignments.every((a, i) => a === prevAssignments[i])) {
        break;
      }
      prevAssignments = [...assignments];
      
      // Assign points to nearest centroid
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let minCluster = 0;
        
        for (let c = 0; c < k; c++) {
          const dist = euclideanDistance(data[i], centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            minCluster = c;
          }
        }
        assignments[i] = minCluster;
      }
      
      // Update centroids
      for (let c = 0; c < k; c++) {
        const clusterPoints = data.filter((_, i) => assignments[i] === c);
        if (clusterPoints.length > 0) {
          for (let d = 0; d < dims; d++) {
            centroids[c][d] = mean(clusterPoints.map(p => p[d]));
          }
        }
      }
    }
    
    // Calculate cluster sizes
    const sizes = [];
    for (let c = 0; c < k; c++) {
      sizes[c] = assignments.filter(a => a === c).length;
    }
    
    // Calculate within-cluster sum of squares
    let wcss = 0;
    for (let i = 0; i < n; i++) {
      wcss += Math.pow(euclideanDistance(data[i], centroids[assignments[i]]), 2);
    }
    
    return {
      centroids,
      assignments,
      sizes,
      wcss,
      k
    };
  }
  
  /**
   * Initialize centroids using k-means++ approach
   */
  function initializeCentroids(data, k) {
    const n = data.length;
    const dims = data[0].length;
    const centroids = [];
    
    // First centroid: random point
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push([...data[firstIdx]]);
    
    // Remaining centroids: probability proportional to distance squared
    for (let c = 1; c < k; c++) {
      const distances = data.map(point => {
        let minDist = Infinity;
        centroids.forEach(centroid => {
          const dist = euclideanDistance(point, centroid);
          if (dist < minDist) minDist = dist;
        });
        return minDist * minDist;
      });
      
      const totalDist = distances.reduce((a, b) => a + b, 0);
      const threshold = Math.random() * totalDist;
      
      let cumSum = 0;
      for (let i = 0; i < n; i++) {
        cumSum += distances[i];
        if (cumSum >= threshold) {
          centroids.push([...data[i]]);
          break;
        }
      }
    }
    
    return centroids;
  }
  
  /**
   * Euclidean distance between two points
   */
  function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
  
  // ==================== PREFERENCE MODELING ====================
  
  /**
   * Vector model: preference increases monotonically in direction of ideal
   * Projects customer ideal points as direction vectors
   * 
   * Uses contrast-enhanced weighting to push customers away from center:
   * - Normalizes preferences per customer (so weights sum to 1)
   * - Applies power transform to exaggerate preference differences
   * - Centers preferences so low-rated brands contribute negatively
   */
  function vectorModelIdealPoints(preferenceData, brandCoords, options = {}) {
    const customers = preferenceData.customers;
    const brands = preferenceData.brands;
    const idealPoints = [];
    
    // Power parameter: higher = more extreme positioning (default 2 for moderate spread)
    const contrastPower = options.contrastPower || 2;
    
    customers.forEach((prefs, custIdx) => {
      // Step 1: Center preferences around customer's mean
      // This makes low-rated brands pull AWAY from ideal point
      const meanPref = prefs.reduce((a, b) => a + b, 0) / prefs.length;
      const centeredPrefs = prefs.map(p => p - meanPref);
      
      // Step 2: Apply signed power transform to exaggerate differences
      // Preserves sign: positive prefs become more positive, negative more negative
      const enhancedPrefs = centeredPrefs.map(p => {
        const sign = p >= 0 ? 1 : -1;
        return sign * Math.pow(Math.abs(p), contrastPower);
      });
      
      // Step 3: Compute weighted position
      let idealX = 0, idealY = 0, idealZ = 0;
      let totalWeight = 0;
      
      brands.forEach((brand, bIdx) => {
        const coords = brandCoords[brand];
        if (coords) {
          const weight = enhancedPrefs[bIdx];
          idealX += weight * coords[0];
          idealY += weight * coords[1];
          idealZ += weight * (coords[2] || 0);
          totalWeight += Math.abs(weight);
        }
      });
      
      // Normalize to maintain reasonable scale
      if (totalWeight > 0) {
        // Scale factor ensures spread is similar to brand spread
        const scaleFactor = 1.5; // Allows customers beyond brand envelope
        idealPoints.push({
          customer: custIdx + 1,
          coords: [
            (idealX / totalWeight) * scaleFactor, 
            (idealY / totalWeight) * scaleFactor, 
            (idealZ / totalWeight) * scaleFactor
          ],
          type: 'vector'
        });
      }
    });
    
    return idealPoints;
  }
  
  /**
   * Ideal point model with satiation (inverse distance model)
   * Preference decreases with distance from ideal
   */
  function idealPointModel(preferenceData, brandCoords, method = 'regression') {
    // For each customer, find the ideal point that minimizes
    // sum of squared (observed_pref - predicted_pref)
    // where predicted_pref = -distance^2 from ideal point
    
    // Simplified: use weighted average as starting point
    return vectorModelIdealPoints(preferenceData, brandCoords);
  }
  
  // ==================== MARKET SHARE CALCULATIONS ====================
  
  /**
   * Calculate share of preference
   * Share = preference_i / sum(all preferences)
   */
  function shareOfPreference(preferences, brandIdx) {
    const sum = preferences.reduce((a, b) => a + b, 0);
    return sum > 0 ? preferences[brandIdx] / sum : 0;
  }
  
  /**
   * First choice model
   * Share = proportion of customers for whom brand is #1 choice
   */
  function firstChoiceShare(preferenceMatrix, brands) {
    const shares = {};
    brands.forEach(b => shares[b] = 0);
    
    preferenceMatrix.forEach(custPrefs => {
      const maxPref = Math.max(...custPrefs);
      const topBrandIdx = custPrefs.indexOf(maxPref);
      shares[brands[topBrandIdx]] += 1;
    });
    
    const totalCustomers = preferenceMatrix.length;
    brands.forEach(b => shares[b] /= totalCustomers);
    
    return shares;
  }
  
  /**
   * Logit model share
   * Share = exp(preference_i) / sum(exp(all preferences))
   */
  function logitShare(preferences, brands, scale = 1.0) {
    const expPrefs = preferences.map(p => Math.exp(p * scale));
    const sumExp = expPrefs.reduce((a, b) => a + b, 0);
    
    const shares = {};
    brands.forEach((brand, i) => {
      shares[brand] = expPrefs[i] / sumExp;
    });
    
    return shares;
  }
  
  /**
   * Distance-based share from ideal point
   * Closer to ideal = higher share
   */
  function distanceBasedShare(brandCoords, idealPoint) {
    const brands = Object.keys(brandCoords);
    const distances = {};
    
    brands.forEach(brand => {
      distances[brand] = euclideanDistance(brandCoords[brand], idealPoint);
    });
    
    // Convert to attraction (inverse of distance)
    const attractions = {};
    let totalAttraction = 0;
    
    brands.forEach(brand => {
      // Add small constant to avoid division by zero
      attractions[brand] = 1 / (distances[brand] + 0.001);
      totalAttraction += attractions[brand];
    });
    
    // Convert to shares
    const shares = {};
    brands.forEach(brand => {
      shares[brand] = attractions[brand] / totalAttraction;
    });
    
    return shares;
  }
  
  // ==================== STRESS CALCULATION ====================
  
  /**
   * Calculate Kruskal's stress for MDS solution quality
   * Stress = sqrt(sum((d_ij - dist_ij)^2) / sum(d_ij^2))
   */
  function calculateStress(originalDistances, configDistances) {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < originalDistances.length; i++) {
      for (let j = i + 1; j < originalDistances[i].length; j++) {
        const diff = originalDistances[i][j] - configDistances[i][j];
        numerator += diff * diff;
        denominator += originalDistances[i][j] * originalDistances[i][j];
      }
    }
    
    return Math.sqrt(numerator / denominator);
  }
  
  /**
   * Compute distance matrix from brand coordinates
   */
  function computeDistanceMatrix(brandCoords) {
    const brands = Object.keys(brandCoords);
    const n = brands.length;
    const distances = [];
    
    for (let i = 0; i < n; i++) {
      distances[i] = [];
      for (let j = 0; j < n; j++) {
        distances[i][j] = euclideanDistance(brandCoords[brands[i]], brandCoords[brands[j]]);
      }
    }
    
    return { distances, brands };
  }
  
  // ==================== PUBLIC API ====================
  
  return {
    // Matrix operations
    transpose,
    multiply,
    centerMatrix,
    centerMatrix,
    standardizeMatrix,
    covarianceMatrix,
    correlationMatrix,
    
    // Eigendecomposition
    eigenDecomposition,
    
    // PCA
    performPCA,
    
    // Clustering
    kMeansCluster,
    euclideanDistance,
    
    // Preference modeling
    vectorModelIdealPoints,
    idealPointModel,
    
    // Market share
    shareOfPreference,
    firstChoiceShare,
    logitShare,
    distanceBasedShare,
    
    // Stress
    calculateStress,
    computeDistanceMatrix,
    
    // Utility
    mean,
    std
  };
  
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MDSMath;
}
