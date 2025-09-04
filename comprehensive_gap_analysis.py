#!/usr/bin/env python3
"""
Comprehensive Gap Analysis - The Real Problem
===========================================
Compare:
1. What providers actually have (from their docs)
2. What Cline has extracted (from their codebase)  
3. What our extraction script captured
4. What we currently show users
"""

import re
import requests

def extract_cline_groq_models():
    """Extract Groq models from Cline's api.ts"""
    try:
        with open('/tmp/cline_api_latest.ts', 'r') as f:
            content = f.read()
        
        # Find groqModels section
        pattern = r'export const groqModels = \{(.*?)\n\};'
        match = re.search(pattern, content, re.DOTALL)
        
        if not match:
            return []
        
        models_section = match.group(1)
        
        # Extract model names
        model_names = re.findall(r'^\s*"([^"]+)":\s*\{', models_section, re.MULTILINE)
        return model_names
        
    except Exception as e:
        print(f"Error extracting Cline Groq models: {e}")
        return []

def extract_our_groq_models():
    """Extract Groq models from our providers.ts"""
    try:
        with open('src/types/providers.ts', 'r') as f:
            content = f.read()
        
        # Find groq section
        pattern = r'"groq":\s*\{.*?supportedModels:\s*\{(.*?)\}'
        match = re.search(pattern, content, re.DOTALL)
        
        if not match:
            return []
        
        models_section = match.group(1)
        model_names = re.findall(r'"([^"]+)":\s*\{', models_section)
        return model_names
        
    except Exception as e:
        print(f"Error extracting our Groq models: {e}")
        return []

def analyze_groq_gaps():
    """Comprehensive Groq analysis"""
    print("🔍 COMPREHENSIVE GROQ ANALYSIS")
    print("=" * 50)
    
    # Data sources
    actual_groq = {
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile", 
        "meta-llama/llama-guard-4-12b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b", 
        "whisper-large-v3",
        "whisper-large-v3-turbo",
        "groq/compound",
        "groq/compound-mini",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "moonshotai/kimi-k2-instruct",
        "qwen/qwen3-32b"
    }
    
    cline_groq = set(extract_cline_groq_models())
    our_groq = set(extract_our_groq_models())
    
    print(f"📊 Groq Models Comparison:")
    print(f"   Actual Groq API: {len(actual_groq)} models")
    print(f"   Cline Catalog: {len(cline_groq)} models")  
    print(f"   Our Extraction: {len(our_groq)} models")
    print()
    
    print("📋 ACTUAL GROQ MODELS (from their docs):")
    for model in sorted(actual_groq):
        print(f"   ✓ {model}")
    print()
    
    print("📋 CLINE'S GROQ MODELS:")
    for model in sorted(cline_groq):
        print(f"   ✓ {model}")
    print()
    
    print("📋 OUR GROQ MODELS:")
    for model in sorted(our_groq):
        print(f"   ✓ {model}")
    print()
    
    # Gap analysis
    cline_missing = actual_groq - cline_groq
    our_missing_from_cline = cline_groq - our_groq
    our_missing_from_actual = actual_groq - our_groq
    
    print("🚨 GAP ANALYSIS:")
    print(f"   Models Cline is missing from Groq: {len(cline_missing)}")
    for model in sorted(cline_missing):
        print(f"      ❌ {model}")
    
    print(f"   Models we're missing from Cline: {len(our_missing_from_cline)}")
    for model in sorted(our_missing_from_cline):
        print(f"      ❌ {model}")
    
    print(f"   Models we're missing from Actual: {len(our_missing_from_actual)}")
    for model in sorted(our_missing_from_actual):
        print(f"      ❌ {model}")
    
    return {
        'actual_count': len(actual_groq),
        'cline_count': len(cline_groq),
        'our_count': len(our_groq),
        'cline_missing': len(cline_missing),
        'extraction_missing': len(our_missing_from_cline),
        'total_missing': len(our_missing_from_actual)
    }

def check_extraction_script_issue():
    """Check why our extraction script is failing"""
    print("\n🔧 EXTRACTION SCRIPT DIAGNOSIS")
    print("=" * 40)
    
    try:
        with open('extract_cline_models.py', 'r') as f:
            script = f.read()
        
        # Check if groqModels is in the search patterns
        if 'groqModels' in script:
            print("✅ Script searches for 'groqModels'")
        else:
            print("❌ Script does NOT search for 'groqModels'")
        
        # Check regex patterns
        patterns = re.findall(r'export const (\w+Models)', script)
        print(f"📋 Script searches for these patterns: {patterns}")
        
        # Check if all catalogs are found
        with open('/tmp/cline_api_latest.ts', 'r') as f:
            cline_content = f.read()
        
        actual_catalogs = re.findall(r'export const (\w+Models) = \{', cline_content)
        print(f"📊 Actual model catalogs in Cline: {len(actual_catalogs)}")
        for catalog in actual_catalogs:
            print(f"   - {catalog}")
        
        return {
            'script_patterns': len(patterns),
            'actual_catalogs': len(actual_catalogs),
            'coverage': len([p for p in patterns if p in actual_catalogs]) / len(actual_catalogs) * 100 if actual_catalogs else 0
        }
        
    except Exception as e:
        print(f"❌ Error analyzing extraction script: {e}")
        return {}

def main():
    """Run comprehensive gap analysis"""
    groq_analysis = analyze_groq_gaps()
    extraction_analysis = check_extraction_script_issue()
    
    print("\n" + "=" * 60)
    print("🎯 COMPREHENSIVE GAP ANALYSIS SUMMARY")
    print("=" * 60)
    
    print(f"📊 GROQ EXAMPLE:")
    print(f"   Real Groq API: {groq_analysis.get('actual_count', 0)} models")
    print(f"   Cline Catalog: {groq_analysis.get('cline_count', 0)} models") 
    print(f"   Our Extraction: {groq_analysis.get('our_count', 0)} models")
    print(f"   Extraction Efficiency: {(groq_analysis.get('our_count', 0) / groq_analysis.get('cline_count', 1) * 100):.1f}%")
    
    print(f"\n🔧 EXTRACTION SCRIPT:")
    print(f"   Script Pattern Coverage: {extraction_analysis.get('coverage', 0):.1f}%")
    print(f"   Patterns Found: {extraction_analysis.get('script_patterns', 0)}")
    print(f"   Actual Catalogs: {extraction_analysis.get('actual_catalogs', 0)}")
    
    total_missing = groq_analysis.get('total_missing', 0)
    
    if total_missing > 10:
        print(f"\n🚨 CRITICAL ISSUE IDENTIFIED:")
        print(f"   Missing {total_missing} models from just Groq alone")
        print(f"   Extrapolating across all providers: likely missing 200+ models")
        print(f"   Root cause: Extraction script incomplete")
    
    print(f"\n💡 IMMEDIATE ACTIONS NEEDED:")
    print(f"   1. Fix extraction script to find ALL model catalogs")
    print(f"   2. Re-run extraction to get complete catalog")
    print(f"   3. Cross-validate with provider documentation")
    print(f"   4. Deploy corrected catalog")

if __name__ == "__main__":
    main()