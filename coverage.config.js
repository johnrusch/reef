// Coverage configuration for c8
module.exports = {
  // Coverage thresholds
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
  
  // Reporter configurations
  reporter: [
    'text',
    'html',
    'json',
    'lcov',
    'clover'
  ],
  
  // Output directories
  reportsDir: 'coverage',
  tempDirectory: '.nyc_output',
  
  // File patterns to include/exclude
  include: [
    'src/**/*.{ts,tsx}',
  ],
  
  exclude: [
    'src/**/*.d.ts',
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'src/**/__tests__/**',
    'src/**/__mocks__/**',
    'src/main/main.ts',
    'src/main/preload.ts',
    'node_modules/**',
    'dist/**',
    'tests/**',
    'coverage/**',
    '**/*.config.{js,ts}',
    '**/*.d.ts'
  ],
  
  // Source map support
  sourceMap: true,
  
  // Instrument settings
  instrument: true,
  
  // Check coverage thresholds
  checkCoverage: true,
  
  // Per-file thresholds (stricter for critical files)
  perFile: true,
  
  // Watermarks for coverage reporting
  watermarks: {
    statements: [70, 80],
    functions: [70, 80],
    branches: [70, 80],
    lines: [70, 80]
  },
  
  // Skip files with no coverage
  skipEmpty: true,
  
  // Skip files that are 100% covered
  skipFull: false,
  
  // Clean coverage directory before running
  clean: true,
  
  // All files should be included in coverage report
  all: true,
  
  // Cache settings
  cache: true,
  cacheDir: '.nyc_output',
  
  // Parallel processing
  enableDynamicSourcemaps: true,
  
  // Extensions to process
  extension: ['.ts', '.tsx', '.js', '.jsx'],
  
  // Babel settings for TypeScript
  babelrc: false,
  useSpawnWrap: true,
  
  // Additional c8 specific settings
  src: ['src'],
  
  // Exclude patterns for c8
  excludeNodeModules: true,
  
  // Report uncovered lines
  reportUncoveredLines: true,
  
  // Show branch coverage in reports
  showBranchCoverage: true,
  
  // Fail build if coverage is below threshold
  failOnLowCoverage: true,
  
  // Custom coverage rules for different file types
  rules: {
    // Utilities and helpers should have high coverage
    'src/shared/utils/**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    
    // Services should have good coverage
    'src/main/services/**/*.ts': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    
    // Components should have reasonable coverage
    'src/renderer/components/**/*.tsx': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    
    // Store/state management should be well tested
    'src/renderer/stores/**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    
    // Types and interfaces don't need coverage
    'src/**/*.d.ts': {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    }
  },
  
  // Custom reporting
  customReporting: {
    // Generate badge for README
    generateBadge: true,
    badgeStyle: 'flat-square',
    
    // Generate summary for CI
    generateSummary: true,
    summaryFormat: 'json',
    
    // Highlight uncovered code
    highlightUncovered: true,
    
    // Show only changed files in PR context
    changedFilesOnly: process.env.CI === 'true' && process.env.GITHUB_EVENT_NAME === 'pull_request'
  }
};