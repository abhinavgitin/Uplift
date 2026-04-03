/**
 * AlgoLens - Code Pattern Scanner
 * Detects patterns in user code for complexity estimation
 */

const CodeScanner = {
  /**
   * Analyze code and return detected patterns
   */
  analyze(code, language = 'javascript') {
    if (!code || typeof code !== 'string') {
      return { patterns: [], warnings: [], complexity: { time: 'Unknown', space: 'Unknown' } };
    }

    const patterns = [];
    const warnings = [];
    let timeComplexity = 'O(1)';
    let spaceComplexity = 'O(1)';

    // Count basic structures
    const forLoops = (code.match(/\bfor\s*\(/g) || []).length;
    const whileLoops = (code.match(/\bwhile\s*\(/g) || []).length;
    const totalLoops = forLoops + whileLoops;

    // Detect recursion
    const functionMatches = code.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*=\s*function/g);
    const functionNames = functionMatches ? 
      functionMatches.map(m => m.match(/\w+/g)?.[1] || m.match(/\w+/g)?.[0]).filter(Boolean) : [];
    
    const hasRecursion = functionNames.some(name => {
      const regex = new RegExp(`\\b${name}\\s*\\(`, 'g');
      const calls = (code.match(regex) || []).length;
      return calls > 1; // Function defined and called again inside
    });

    // Detect nested loops
    const nestedLoopPattern = /for\s*\([^)]*\)\s*\{[^}]*for\s*\(|while\s*\([^)]*\)\s*\{[^}]*while\s*\(|for\s*\([^)]*\)\s*\{[^}]*while\s*\(|while\s*\([^)]*\)\s*\{[^}]*for\s*\(/gs;
    const nestedLoops = (code.match(nestedLoopPattern) || []).length;

    // Detect data structures
    const hasMap = /\bnew Map\b|\bnew Set\b|\{\s*\}/.test(code);
    const hasArray = /\[\s*\]|\bnew Array\b/.test(code);
    const hasStack = /\.push\(.*\.pop\(\)/.test(code) || /stack/i.test(code);
    const hasQueue = /\.shift\(\)|\.unshift\(|queue/i.test(code);
    const hasHeap = /heap|priority.*queue/i.test(code);

    // Detect sorting
    const hasSorting = /\.sort\(|sorted\(|Arrays\.sort/i.test(code);

    // Detect binary search patterns
    const hasBinarySearch = /while\s*\([^)]*(?:left|lo|start)\s*[<>=]+\s*(?:right|hi|end)[^)]*\)|mid\s*=|binarySearch/i.test(code);

    // Detect two pointers
    const hasTwoPointers = /(?:left|i)\s*[<>=]+\s*(?:right|j)|while.*(?:left|i).*(?:right|j)/i.test(code);

    // Detect sliding window
    const hasSlidingWindow = /window|slide|(?:left|start).*(?:right|end).*sum|(?:right|end)\s*-\s*(?:left|start)/i.test(code);

    // Detect dynamic programming
    const hasDP = /\bdp\b|\bmemo\b|cache|tabulation/i.test(code);

    // Build patterns list
    if (totalLoops > 0) {
      patterns.push({
        type: 'loop',
        count: totalLoops,
        description: `${totalLoops} loop(s) detected`
      });
    }

    if (nestedLoops > 0) {
      patterns.push({
        type: 'nested-loop',
        count: nestedLoops,
        description: `${nestedLoops} nested loop structure(s)`
      });
      warnings.push({
        type: 'complexity',
        message: 'Nested loops may indicate O(n²) or higher complexity'
      });
    }

    if (hasRecursion) {
      patterns.push({
        type: 'recursion',
        description: 'Recursive function detected'
      });
    }

    if (hasSorting) {
      patterns.push({
        type: 'sorting',
        description: 'Sorting operation detected'
      });
    }

    if (hasBinarySearch) {
      patterns.push({
        type: 'binary-search',
        description: 'Binary search pattern detected'
      });
    }

    if (hasTwoPointers) {
      patterns.push({
        type: 'two-pointers',
        description: 'Two pointers technique detected'
      });
    }

    if (hasSlidingWindow) {
      patterns.push({
        type: 'sliding-window',
        description: 'Sliding window pattern detected'
      });
    }

    if (hasDP) {
      patterns.push({
        type: 'dynamic-programming',
        description: 'Dynamic programming/memoization detected'
      });
    }

    // Data structure patterns
    if (hasMap) {
      patterns.push({
        type: 'hash-map',
        description: 'Hash map/set usage detected'
      });
    }

    if (hasStack) {
      patterns.push({
        type: 'stack',
        description: 'Stack data structure detected'
      });
    }

    if (hasQueue) {
      patterns.push({
        type: 'queue',
        description: 'Queue data structure detected'
      });
    }

    // Estimate complexity
    if (nestedLoops >= 2) {
      timeComplexity = 'O(n³) or higher';
    } else if (nestedLoops === 1) {
      timeComplexity = 'O(n²)';
    } else if (hasSorting) {
      timeComplexity = 'O(n log n)';
    } else if (hasBinarySearch) {
      timeComplexity = totalLoops > 1 ? 'O(n log n)' : 'O(log n)';
    } else if (totalLoops === 1) {
      timeComplexity = 'O(n)';
    } else if (hasRecursion) {
      timeComplexity = 'Depends on recursion depth';
    }

    if (hasDP || hasMap) {
      spaceComplexity = 'O(n) or more';
    } else if (hasArray) {
      spaceComplexity = 'O(n)';
    } else if (hasRecursion) {
      spaceComplexity = 'O(recursion depth)';
    }

    // Additional warnings
    if (code.includes('arr.includes') || code.includes('.indexOf(')) {
      warnings.push({
        type: 'performance',
        message: 'includes()/indexOf() in a loop creates O(n²) - consider using Set/Map'
      });
    }

    if (code.includes('JSON.parse(JSON.stringify')) {
      warnings.push({
        type: 'performance',
        message: 'Deep clone with JSON is expensive - consider structured clone or manual copy'
      });
    }

    if (code.includes('+ ""') || code.includes('String(')) {
      // Not really a warning, just a note
    }

    return {
      patterns,
      warnings,
      complexity: {
        time: timeComplexity,
        space: spaceComplexity
      },
      stats: {
        loops: totalLoops,
        nestedLoops,
        hasRecursion,
        linesOfCode: code.split('\n').filter(l => l.trim().length > 0).length
      }
    };
  },

  /**
   * Compare two code snippets
   */
  compare(oldCode, newCode) {
    const oldAnalysis = this.analyze(oldCode);
    const newAnalysis = this.analyze(newCode);
    
    const changes = [];
    
    // Compare loop counts
    if (newAnalysis.stats.loops < oldAnalysis.stats.loops) {
      changes.push({
        type: 'improvement',
        message: `Reduced loops from ${oldAnalysis.stats.loops} to ${newAnalysis.stats.loops}`
      });
    } else if (newAnalysis.stats.loops > oldAnalysis.stats.loops) {
      changes.push({
        type: 'change',
        message: `Increased loops from ${oldAnalysis.stats.loops} to ${newAnalysis.stats.loops}`
      });
    }
    
    // Compare nested loops
    if (newAnalysis.stats.nestedLoops < oldAnalysis.stats.nestedLoops) {
      changes.push({
        type: 'improvement',
        message: 'Reduced nesting depth → better complexity'
      });
    } else if (newAnalysis.stats.nestedLoops > oldAnalysis.stats.nestedLoops) {
      changes.push({
        type: 'warning',
        message: 'Added nested loops → increased complexity'
      });
    }
    
    // Compare patterns
    const oldPatternTypes = new Set(oldAnalysis.patterns.map(p => p.type));
    const newPatternTypes = new Set(newAnalysis.patterns.map(p => p.type));
    
    for (const pattern of newPatternTypes) {
      if (!oldPatternTypes.has(pattern)) {
        changes.push({
          type: 'info',
          message: `Added ${pattern} technique`
        });
      }
    }
    
    for (const pattern of oldPatternTypes) {
      if (!newPatternTypes.has(pattern)) {
        changes.push({
          type: 'info',
          message: `Removed ${pattern} technique`
        });
      }
    }
    
    return {
      oldAnalysis,
      newAnalysis,
      changes,
      complexityChange: {
        time: {
          before: oldAnalysis.complexity.time,
          after: newAnalysis.complexity.time
        },
        space: {
          before: oldAnalysis.complexity.space,
          after: newAnalysis.complexity.space
        }
      }
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeScanner;
}
