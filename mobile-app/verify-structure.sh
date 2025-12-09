#!/bin/bash

echo "🔍 Verifying Project Structure..."
echo ""

# Check theme directory
if [ -d "src/theme" ]; then
    echo "✅ src/theme/ exists"
    
    if [ -f "src/theme/index.ts" ]; then
        echo "  ✅ index.ts"
    else
        echo "  ❌ index.ts missing"
    fi
    
    if [ -f "src/theme/colors.ts" ]; then
        echo "  ✅ colors.ts"
    else
        echo "  ❌ colors.ts missing"
    fi
    
    if [ -f "src/theme/typography.ts" ]; then
        echo "  ✅ typography.ts"
    else
        echo "  ❌ typography.ts missing"
    fi
    
    if [ -f "src/theme/spacing.ts" ]; then
        echo "  ✅ spacing.ts"
    else
        echo "  ❌ spacing.ts missing"
    fi
    
    if [ -f "src/theme/shadows.ts" ]; then
        echo "  ✅ shadows.ts"
    else
        echo "  ❌ shadows.ts missing"
    fi
else
    echo "❌ src/theme/ directory missing!"
fi

echo ""

# Check models directory
if [ -d "src/models" ]; then
    echo "✅ src/models/ exists"
    ls src/models/*.ts 2>/dev/null | while read file; do
        echo "  ✅ $(basename $file)"
    done
else
    echo "❌ src/models/ directory missing!"
fi

echo ""

# Check services directory
if [ -d "src/services/api" ]; then
    echo "✅ src/services/api/ exists"
    ls src/services/api/*.ts 2>/dev/null | while read file; do
        echo "  ✅ $(basename $file)"
    done
else
    echo "❌ src/services/api/ directory missing!"
fi

echo ""

# Check screens directory
if [ -d "src/screens" ]; then
    echo "✅ src/screens/ exists"
    if [ -d "src/screens/auth" ]; then
        echo "  ✅ auth/"
    fi
    if [ -d "src/screens/student" ]; then
        echo "  ✅ student/"
    fi
    if [ -d "src/screens/instructor" ]; then
        echo "  ✅ instructor/"
    fi
else
    echo "❌ src/screens/ directory missing!"
fi

echo ""
echo "Verification complete!"
