#!/bin/bash
set -e

# Comprehensive Provider Validation & Model Discovery
# ===================================================
# This script runs the complete validation workflow:
# 1. Provider health checks
# 2. Model discovery from documentation
# 3. Comparison with current catalog
# 4. Report generation and recommendations

echo "🚀 Starting Comprehensive Provider Validation & Model Discovery"
echo "=============================================================="

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="validation_results_${TIMESTAMP}"
REPORT_FILE="comprehensive_validation_report_${TIMESTAMP}.md"

# Create results directory
mkdir -p "$RESULTS_DIR"
cd "$RESULTS_DIR"

echo "📁 Results will be saved to: $RESULTS_DIR"
echo ""

# Step 1: Provider Health Check
echo "🔍 Step 1: Running Provider Health Check"
echo "----------------------------------------"
python3 ../simple_provider_check.py > provider_health.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Provider health check completed successfully"
    HEALTH_SUCCESS=true
    # Extract accessible count
    ACCESSIBLE_APIS=$(grep "Accessible APIs:" provider_health.log | grep -o '[0-9]*/[0-9]*' || echo "0/0")
    echo "   Accessible APIs: $ACCESSIBLE_APIS"
else
    echo "❌ Provider health check failed"
    HEALTH_SUCCESS=false
    ACCESSIBLE_APIS="0/0"
fi
echo ""

# Step 2: Model Discovery
echo "🤖 Step 2: Running Automated Model Discovery"
echo "--------------------------------------------"
python3 ../automated_model_discovery.py > model_discovery.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Model discovery completed successfully"
    DISCOVERY_SUCCESS=true
    # Extract discovery statistics
    TOTAL_MODELS=$(grep "Total Models Discovered:" model_discovery.log | grep -o '[0-9]*' || echo "0")
    PROVIDERS_WITH_MODELS=$(grep "Providers with Models:" model_discovery.log | grep -o '[0-9]*' || echo "0")
    echo "   Total Models Discovered: $TOTAL_MODELS"
    echo "   Providers with Models: $PROVIDERS_WITH_MODELS"
else
    echo "❌ Model discovery failed"
    DISCOVERY_SUCCESS=false
    TOTAL_MODELS=0
    PROVIDERS_WITH_MODELS=0
fi
echo ""

# Step 3: Current Catalog Analysis
echo "📊 Step 3: Analyzing Current Catalog"
echo "------------------------------------"
if [ -f "../src/types/providers.ts" ]; then
    CURRENT_PROVIDERS=$(grep -c '"[^"]*": {' ../src/types/providers.ts || echo "0")
    
    # Calculate total current models (rough estimate)
    CURRENT_MODELS=$(grep -o 'supportedModels: {' ../src/types/providers.ts | wc -l | xargs)
    
    echo "✅ Current catalog analyzed"
    echo "   Current Providers: $CURRENT_PROVIDERS"
    echo "   Estimated Current Models: $CURRENT_MODELS"
    
    # Determine if significant changes
    if [ "$TOTAL_MODELS" -gt $((CURRENT_MODELS + 50)) ]; then
        SIGNIFICANT_CHANGES=true
        echo "🚨 Significant changes detected! ($TOTAL_MODELS > $CURRENT_MODELS + 50)"
    else
        SIGNIFICANT_CHANGES=false
        echo "✅ No significant changes detected"
    fi
else
    echo "❌ Could not find current providers.ts file"
    CURRENT_PROVIDERS=0
    CURRENT_MODELS=0
    SIGNIFICANT_CHANGES=false
fi
echo ""

# Step 4: Generate Comprehensive Report
echo "📋 Step 4: Generating Comprehensive Report"
echo "-------------------------------------------"

cat > "$REPORT_FILE" << EOF
# Comprehensive Provider Validation Report

**Generated**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')  
**Script Version**: 1.0  
**Results Directory**: \`$RESULTS_DIR\`

## 🎯 Executive Summary

$(if [ "$SIGNIFICANT_CHANGES" == "true" ]; then
    echo "🚨 **SIGNIFICANT CHANGES DETECTED** - Immediate attention required"
    echo ""
    echo "The automated discovery system found **$TOTAL_MODELS new models**, significantly more than our current catalog of **$CURRENT_MODELS models**. This suggests major updates are available from AI providers."
else
    echo "✅ **CATALOG UP-TO-DATE** - No major changes detected"
    echo ""
    echo "The automated discovery found **$TOTAL_MODELS models**, which aligns well with our current catalog of **$CURRENT_MODELS models**."
fi)

## 📊 Key Metrics

| Metric | Current | Discovered | Status |
|--------|---------|------------|---------|
| API Endpoints Accessible | $ACCESSIBLE_APIS | - | $(if [ "$HEALTH_SUCCESS" == "true" ]; then echo "✅ Healthy"; else echo "❌ Issues"; fi) |
| Total Providers | $CURRENT_PROVIDERS | $PROVIDERS_WITH_MODELS | $(if [ "$PROVIDERS_WITH_MODELS" -ge "$CURRENT_PROVIDERS" ]; then echo "✅ Growing"; else echo "⚠️ Declining"; fi) |
| Total Models | $CURRENT_MODELS | $TOTAL_MODELS | $(if [ "$SIGNIFICANT_CHANGES" == "true" ]; then echo "🚨 Major Gap"; else echo "✅ Aligned"; fi) |

## 🔍 Detailed Results

### Provider Health Check
$(if [ "$HEALTH_SUCCESS" == "true" ]; then
    echo "\`\`\`"
    tail -n 20 provider_health.log 2>/dev/null || echo "Results available in provider_health.log"
    echo "\`\`\`"
else
    echo "❌ Health check failed. See \`provider_health.log\` for details."
fi)

### Model Discovery
$(if [ "$DISCOVERY_SUCCESS" == "true" ]; then
    echo "\`\`\`"
    tail -n 30 model_discovery.log 2>/dev/null || echo "Results available in model_discovery.log"
    echo "\`\`\`"
else
    echo "❌ Model discovery failed. See \`model_discovery.log\` for details."
fi)

## 🎯 Recommendations

### Immediate Actions
$(if [ "$SIGNIFICANT_CHANGES" == "true" ]; then
    echo "1. **🚨 HIGH PRIORITY**: Review discovered models and update catalog"
    echo "2. **🔄 URGENT**: Run extraction script with latest provider data"
    echo "3. **🧪 CRITICAL**: Test updated catalog before deployment"
    echo "4. **🚀 DEPLOY**: Update production catalog with new models"
else
    echo "1. ✅ Catalog appears current - continue regular monitoring"
    echo "2. 🔄 Schedule next validation for 1 week"
    echo "3. 📊 Monitor for provider API changes"
fi)

### Long-term Improvements
1. **🤖 Automation**: Set up weekly GitHub Actions workflow
2. **🔔 Alerts**: Configure Slack/Discord notifications for changes
3. **🔑 API Keys**: Set up authenticated access for better discovery
4. **📈 Monitoring**: Implement provider uptime tracking
5. **🧪 Testing**: Add automated validation of discovered models

## 📁 Generated Files

- \`provider_health.log\` - Complete provider health check results
- \`model_discovery.log\` - Complete model discovery results  
- \`provider_check_*.json\` - Machine-readable health check data
- \`model_discovery_*.json\` - Machine-readable discovery data
- \`discovered_models_*.ts\` - TypeScript model definitions ready for integration

## 🔗 Integration Commands

### Update Catalog (if needed)
\`\`\`bash
# Review discovered models
cat discovered_models_*.ts

# Run extraction script with latest data
python3 ../extract_cline_models.py

# Update providers.ts
python3 ../replace_providers.py

# Test and deploy
npm run build && npm run lint
\`\`\`

### Monitor Provider Health
\`\`\`bash
# Run quick health check
python3 ../simple_provider_check.py

# Check specific provider
curl -I https://api.openai.com/v1/models
\`\`\`

---
*This report was automatically generated by the Comprehensive Provider Validation System*
EOF

echo "✅ Comprehensive report generated: $REPORT_FILE"
echo ""

# Step 5: Summary and Next Steps
echo "🎯 Validation Complete - Summary & Next Steps"
echo "============================================="
echo ""
echo "📊 RESULTS SUMMARY:"
echo "   Health Check: $(if [ "$HEALTH_SUCCESS" == "true" ]; then echo "✅ Success"; else echo "❌ Failed"; fi)"
echo "   Model Discovery: $(if [ "$DISCOVERY_SUCCESS" == "true" ]; then echo "✅ Success"; else echo "❌ Failed"; fi)"
echo "   APIs Accessible: $ACCESSIBLE_APIS"
echo "   Models Discovered: $TOTAL_MODELS"
echo "   Significant Changes: $(if [ "$SIGNIFICANT_CHANGES" == "true" ]; then echo "🚨 YES"; else echo "✅ No"; fi)"
echo ""

if [ "$SIGNIFICANT_CHANGES" == "true" ]; then
    echo "🚨 IMMEDIATE ACTION REQUIRED:"
    echo "   1. Review the comprehensive report: $REPORT_FILE"
    echo "   2. Check discovered models: discovered_models_*.ts"
    echo "   3. Update your model catalog with new findings"
    echo "   4. Run extraction and deployment workflow"
    echo ""
    echo "🔗 QUICK START:"
    echo "   cd $RESULTS_DIR"
    echo "   cat $REPORT_FILE"
    echo "   cat discovered_models_*.ts"
else
    echo "✅ CATALOG STATUS: Up-to-date"
    echo "   Your model catalog appears to be current"
    echo "   Continue with regular monitoring schedule"
    echo ""
    echo "📅 NEXT VALIDATION: Recommended in 1 week"
fi

echo ""
echo "📁 All results saved in: $RESULTS_DIR/"
echo "📋 Full report: $RESULTS_DIR/$REPORT_FILE"
echo ""
echo "🔗 For automation setup, check: .github/workflows/provider-validation.yml"
echo "💡 For detailed documentation, see: docs/PROVIDER_VALIDATION.md"

# Final status exit code
if [ "$SIGNIFICANT_CHANGES" == "true" ]; then
    echo "⚠️ Exiting with status 1 to indicate significant changes detected"
    exit 1
else
    echo "✅ Exiting with status 0 - no significant changes"
    exit 0
fi