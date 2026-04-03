/**
 * AlgoLens - Constraint Analyzer
 * Rule-based constraint to complexity mapping
 */

const ConstraintAnalyzer = {
  /**
   * Parse constraint text and extract numerical bounds
   */
  parseConstraints(constraintStrings) {
    const bounds = [];
    
    for (const str of constraintStrings) {
      // Match patterns like: n <= 10^5, 1 ≤ n ≤ 10000, n < 1e6
      const patterns = [
        /(\w+)\s*[<≤<=]+\s*10\^(\d+)/gi,
        /(\w+)\s*[<≤<=]+\s*(\d+)/gi,
        /(\d+)\s*[<≤<=]+\s*(\w+)\s*[<≤<=]+\s*10\^(\d+)/gi,
        /(\d+)\s*[<≤<=]+\s*(\w+)\s*[<≤<=]+\s*(\d+)/gi
      ];
      
      // Extract numbers
      const numbers = str.match(/10\^(\d+)/g);
      if (numbers) {
        numbers.forEach(n => {
          const exp = parseInt(n.replace('10^', ''));
          bounds.push({ raw: n, value: Math.pow(10, exp), exponent: exp });
        });
      }
      
      // Direct numbers
      const directNums = str.match(/\b(\d{3,})\b/g);
      if (directNums) {
        directNums.forEach(n => {
          const val = parseInt(n);
          if (val >= 1) {
            bounds.push({ raw: n, value: val, exponent: Math.log10(val) });
          }
        });
      }
    }
    
    return bounds;
  },

  /**
   * Determine expected complexity based on constraints
   */
  analyzeComplexity(constraintStrings) {
    const bounds = this.parseConstraints(constraintStrings);
    
    if (bounds.length === 0) {
      return {
        time: 'Unknown',
        space: 'Unknown',
        reasoning: 'Could not parse constraints'
      };
    }
    
    // Find the largest bound (primary constraint)
    const maxBound = bounds.reduce((max, b) => b.value > max.value ? b : max, bounds[0]);
    const n = maxBound.value;
    
    let time, space, reasoning;
    
    // Complexity rules based on typical competitive programming constraints
    if (n <= 10) {
      time = 'O(n!) or O(2^n)';
      space = 'O(n) to O(2^n)';
      reasoning = `n ≤ ${n} allows exponential/factorial algorithms (brute force, permutations)`;
    } else if (n <= 20) {
      time = 'O(2^n) or O(n × 2^n)';
      space = 'O(2^n)';
      reasoning = `n ≤ ${n} suggests bitmask DP or subset enumeration`;
    } else if (n <= 100) {
      time = 'O(n³) or O(n² × log n)';
      space = 'O(n²)';
      reasoning = `n ≤ ${n} allows cubic complexity (Floyd-Warshall, matrix operations)`;
    } else if (n <= 1000) {
      time = 'O(n²)';
      space = 'O(n²) or O(n)';
      reasoning = `n ≤ ${n} allows quadratic complexity (nested loops, 2D DP)`;
    } else if (n <= 10000) {
      time = 'O(n²) or O(n × √n)';
      space = 'O(n)';
      reasoning = `n ≤ ${n} is borderline for O(n²), consider optimizations`;
    } else if (n <= 100000) {
      time = 'O(n log n) or O(n)';
      space = 'O(n)';
      reasoning = `n ≤ 10^5 requires O(n log n) or better (sorting, trees, binary search)`;
    } else if (n <= 1000000) {
      time = 'O(n) or O(n log n)';
      space = 'O(n) or O(1)';
      reasoning = `n ≤ 10^6 requires linear or near-linear time`;
    } else if (n <= 10000000) {
      time = 'O(n)';
      space = 'O(1) or O(√n)';
      reasoning = `n ≤ 10^7 requires strictly linear time with minimal space`;
    } else {
      time = 'O(log n) or O(1)';
      space = 'O(1)';
      reasoning = `n > 10^7 requires sublinear time (math formula, binary search on answer)`;
    }
    
    return { time, space, reasoning, maxN: n };
  },

  /**
   * Generate human-readable constraint insights
   */
  getInsights(constraintStrings) {
    const analysis = this.analyzeComplexity(constraintStrings);
    const insights = [];
    
    if (analysis.maxN) {
      insights.push({
        type: 'bound',
        message: `Primary constraint: n ≈ ${analysis.maxN.toLocaleString()}`
      });
    }
    
    insights.push({
      type: 'time',
      message: `Expected time complexity: ${analysis.time}`
    });
    
    insights.push({
      type: 'space',
      message: `Expected space complexity: ${analysis.space}`
    });
    
    insights.push({
      type: 'reasoning',
      message: analysis.reasoning
    });
    
    // Special pattern hints
    if (constraintStrings.some(c => c.includes('-10') || c.includes('negative'))) {
      insights.push({
        type: 'warning',
        message: 'Watch for negative numbers - may affect approach'
      });
    }
    
    if (constraintStrings.some(c => c.toLowerCase().includes('unique'))) {
      insights.push({
        type: 'hint',
        message: 'Unique elements - consider set/hash operations'
      });
    }
    
    if (constraintStrings.some(c => c.toLowerCase().includes('sorted'))) {
      insights.push({
        type: 'hint',
        message: 'Input is sorted - binary search may be useful'
      });
    }
    
    return insights;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConstraintAnalyzer;
}
