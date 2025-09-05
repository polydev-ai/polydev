#!/usr/bin/env python3
"""
Focused Provider Validation - Manual Cross-Check
===============================================
Manually validate specific providers against their official documentation
to ensure our catalog is complete and accurate.
"""

import requests
import re
from typing import Dict, List, Set
import json

def extract_current_models(provider: str) -> Set[str]:
    """Extract current models for a provider from providers.ts with proper brace counting"""
    with open('src/types/providers.ts', 'r') as f:
        content = f.read()
    
    # Find the provider section
    provider_start = content.find(f'"{provider}": {{')
    if provider_start == -1:
        print(f"❌ Could not find {provider} in providers.ts")
        return set()
    
    # Find supportedModels within provider section
    models_start = content.find('supportedModels: {', provider_start)
    if models_start == -1:
        print(f"❌ Could not find supportedModels in {provider}")
        return set()
    
    # Count braces to find the correct closing brace for supportedModels
    brace_count = 1
    i = models_start + len('supportedModels: {')
    models_end = i
    
    while i < len(content) and brace_count > 0:
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                models_end = i
                break
        i += 1
    
    models_section = content[models_start + len('supportedModels: {'):models_end]
    
    # Extract model names
    model_names = re.findall(r'"([^"]+)":\s*\{', models_section)
    return set(model_names)

def validate_groq() -> Dict:
    """Validate Groq models"""
    print("🔍 Validating Groq models...")
    
    current_models = extract_current_models("groq")
    print(f"📊 Current Groq models in catalog: {len(current_models)}")
    for model in sorted(current_models):
        print(f"   - {model}")
    
    # From web scraping, we found these models are available:
    available_models = {
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
    
    print(f"\n📋 Available Groq models (from docs): {len(available_models)}")
    for model in sorted(available_models):
        print(f"   - {model}")
    
    missing = available_models - current_models
    extra = current_models - available_models
    
    print(f"\n🚨 Missing models ({len(missing)}):")
    for model in sorted(missing):
        print(f"   ❌ {model}")
    
    print(f"\n⚠️ Extra models in catalog ({len(extra)}):")
    for model in sorted(extra):
        print(f"   ⚠️ {model} (might be outdated)")
    
    return {
        'provider': 'groq',
        'current_count': len(current_models),
        'available_count': len(available_models),
        'missing_count': len(missing),
        'extra_count': len(extra),
        'missing': list(missing),
        'extra': list(extra),
        'accuracy': len(current_models & available_models) / len(available_models) * 100
    }

def validate_anthropic() -> Dict:
    """Validate Anthropic models"""
    print("\n🔍 Validating Anthropic models...")
    
    current_models = extract_current_models("anthropic")
    print(f"📊 Current Anthropic models in catalog: {len(current_models)}")
    for model in sorted(current_models):
        print(f"   - {model}")
    
    # From web scraping, these models are available:
    available_models = {
        "claude-opus-4-1-20250805",  # Latest flagship
        "claude-opus-4-20250514",    # Previous flagship
        "claude-sonnet-4-20250514",  # High performance
        "claude-sonnet-3-7-20250110", # Extended thinking
        "claude-haiku-3-5-20241022",  # Fastest
        "claude-haiku-3-20240307"     # Compact
    }
    
    print(f"\n📋 Available Anthropic models (from docs): {len(available_models)}")
    for model in sorted(available_models):
        print(f"   - {model}")
    
    missing = available_models - current_models
    extra = current_models - available_models
    
    print(f"\n🚨 Missing models ({len(missing)}):")
    for model in sorted(missing):
        print(f"   ❌ {model}")
    
    print(f"\n⚠️ Extra models in catalog ({len(extra)}):")
    for model in sorted(extra):
        print(f"   ⚠️ {model} (might be outdated)")
    
    return {
        'provider': 'anthropic',
        'current_count': len(current_models),
        'available_count': len(available_models),
        'missing_count': len(missing),
        'extra_count': len(extra),
        'missing': list(missing),
        'extra': list(extra),
        'accuracy': len(current_models & available_models) / len(available_models) * 100
    }

def validate_mistral() -> Dict:
    """Validate Mistral models"""
    print("\n🔍 Validating Mistral models...")
    
    current_models = extract_current_models("mistral")
    print(f"📊 Current Mistral models in catalog: {len(current_models)}")
    for model in sorted(current_models):
        print(f"   - {model}")
    
    # From web scraping, these models are available:
    available_models = {
        # Premier Models
        "mistral-medium-3.1",
        "mistral-medium-3",
        "mistral-medium-2312",
        "mistral-large-2.1",
        "mistral-large-2402",
        "mistral-large-2407",
        "mistral-small-3.2",
        "mistral-small-3.1", 
        "mistral-small-3",
        "mistral-small-2",
        # Specialized
        "codestral",
        "ministral-3b",
        "ministral-8b",
        "mistral-embed",
        "mistral-moderation",
        # Open Models
        "pixtral-12b",
        "mistral-nemo-12b",
        # Legacy
        "mistral-7b",
        "mixtral-8x7b",
        "mixtral-8x22b"
    }
    
    print(f"\n📋 Available Mistral models (from docs): {len(available_models)}")
    for model in sorted(available_models):
        print(f"   - {model}")
    
    missing = available_models - current_models
    extra = current_models - available_models
    
    print(f"\n🚨 Missing models ({len(missing)}):")
    for model in sorted(missing):
        print(f"   ❌ {model}")
    
    print(f"\n⚠️ Extra models in catalog ({len(extra)}):")
    for model in sorted(extra):
        print(f"   ⚠️ {model} (might be outdated)")
    
    return {
        'provider': 'mistral',
        'current_count': len(current_models),
        'available_count': len(available_models),
        'missing_count': len(missing),
        'extra_count': len(extra),
        'missing': list(missing),
        'extra': list(extra),
        'accuracy': len(current_models & available_models) / len(available_models) * 100
    }

def main():
    """Run focused validation on key providers"""
    print("🎯 FOCUSED PROVIDER VALIDATION")
    print("=" * 50)
    print("Checking specific providers against their official docs...")
    print()
    
    results = []
    
    # Validate key providers
    results.append(validate_groq())
    results.append(validate_anthropic())
    results.append(validate_mistral())
    
    # Generate summary
    print("\n" + "=" * 50)
    print("📊 VALIDATION SUMMARY")
    print("=" * 50)
    
    total_missing = 0
    total_extra = 0
    
    for result in results:
        provider = result['provider']
        accuracy = result['accuracy']
        missing = result['missing_count']
        extra = result['extra_count']
        
        status = "✅" if accuracy > 80 and missing < 5 else "⚠️" if accuracy > 50 else "❌"
        
        print(f"{status} {provider.upper()}: {accuracy:.1f}% accurate")
        print(f"   Current: {result['current_count']}, Available: {result['available_count']}")
        print(f"   Missing: {missing}, Extra: {extra}")
        
        total_missing += missing
        total_extra += extra
    
    print(f"\n🚨 TOTAL MISSING MODELS: {total_missing}")
    print(f"⚠️ TOTAL EXTRA MODELS: {total_extra}")
    
    if total_missing > 10:
        print("\n🚨 SIGNIFICANT GAPS DETECTED!")
        print("Recommendation: Update extraction script to capture missing models")
    elif total_missing > 0:
        print("\n⚠️ Minor gaps detected")
        print("Recommendation: Review and add missing models manually")
    else:
        print("\n✅ Catalog appears complete!")
    
    # Save detailed results
    with open('focused_validation_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: focused_validation_results.json")

if __name__ == "__main__":
    main()