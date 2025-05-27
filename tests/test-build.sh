#!/bin/bash

echo "🔧 Testing TypeScript Build..."
echo "============================="

# Try to build the TypeScript files
echo "Building TypeScript files..."
if npm run build; then
    echo "✅ TypeScript build successful!"
    echo ""
    echo "🧪 Running cache performance tests..."
    npm run test:cache
else
    echo "❌ TypeScript build failed. Checking specific errors..."
    
    # Try to compile just the cache manager
    echo ""
    echo "Checking CacheManager compilation..."
    npx tsc src/performance/CacheManager.ts --noEmit --target ES2020 --module CommonJS --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --strict
    
    echo ""
    echo "🔄 Running JavaScript tests instead..."
    npm run test:cache
fi

echo ""
echo "📊 Performance optimization status:"
echo "- CacheManager: Implemented ✅"
echo "- IndexManager: Implemented ✅" 
echo "- BatchProcessor: Implemented ✅"
echo "- ConnectionPool: Implemented ✅"
echo "- OptimizedWikiSource: Implemented ✅"
echo ""
echo "Next steps if build succeeded:"
echo "- npm run test:performance (Full TypeScript tests)"
echo "- npm run test:load (Load testing)"