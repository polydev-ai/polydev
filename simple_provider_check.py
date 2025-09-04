#!/usr/bin/env python3
"""
Simple Provider Health Check & Model Discovery
==============================================
Validates key providers without complex parsing.
"""

import requests
import asyncio
import aiohttp
import time
from datetime import datetime
import json

# Key providers to validate
PROVIDERS_TO_CHECK = {
    'openai': {
        'name': 'OpenAI',
        'api_url': 'https://api.openai.com/v1/models',
        'doc_url': 'https://platform.openai.com/docs/models/overview',
        'expected_models': ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    'anthropic': {
        'name': 'Anthropic',
        'api_url': 'https://api.anthropic.com/v1/messages',
        'doc_url': 'https://docs.anthropic.com/claude/docs/models-overview',
        'expected_models': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229']
    },
    'google': {
        'name': 'Google Gemini',
        'api_url': 'https://generativelanguage.googleapis.com/v1/models',
        'doc_url': 'https://ai.google.dev/gemini-api/docs/models/gemini',
        'expected_models': ['gemini-1.5-pro', 'gemini-1.5-flash']
    },
    'mistral': {
        'name': 'Mistral AI',
        'api_url': 'https://api.mistral.ai/v1/models',
        'doc_url': 'https://docs.mistral.ai/getting-started/models/',
        'expected_models': ['mistral-large-latest', 'mistral-medium']
    },
    'groq': {
        'name': 'Groq',
        'api_url': 'https://api.groq.com/openai/v1/models',
        'doc_url': 'https://console.groq.com/docs/models',
        'expected_models': ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768']
    },
    'xai': {
        'name': 'xAI',
        'api_url': 'https://api.x.ai/v1/models',
        'doc_url': 'https://docs.x.ai/docs',
        'expected_models': ['grok-4', 'grok-3-beta']
    },
    'deepseek': {
        'name': 'DeepSeek',
        'api_url': 'https://api.deepseek.com/v1/models',
        'doc_url': 'https://platform.deepseek.com/api-docs/api/create-chat-completion',
        'expected_models': ['deepseek-chat', 'deepseek-coder']
    },
    'together': {
        'name': 'Together AI',
        'api_url': 'https://api.together.xyz/models/info',
        'doc_url': 'https://docs.together.ai/docs/inference-models',
        'expected_models': ['meta-llama/Llama-3-70b-chat-hf']
    },
    'perplexity': {
        'name': 'Perplexity',
        'api_url': 'https://api.perplexity.ai/chat/completions',
        'doc_url': 'https://docs.perplexity.ai/docs/model-cards',
        'expected_models': ['llama-3.1-sonar-small-128k-online']
    },
    'cohere': {
        'name': 'Cohere',
        'api_url': 'https://api.cohere.ai/v1/models',
        'doc_url': 'https://docs.cohere.com/docs/models',
        'expected_models': ['command-r-plus', 'command-r']
    }
}

async def check_provider_endpoint(provider_id, config):
    """Check if provider endpoint is accessible"""
    print(f"🔍 Checking {config['name']}...")
    
    try:
        start_time = time.time()
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            async with session.get(config['api_url']) as response:
                response_time = (time.time() - start_time) * 1000
                
                result = {
                    'provider': provider_id,
                    'name': config['name'],
                    'status_code': response.status,
                    'response_time_ms': round(response_time, 2),
                    'accessible': 200 <= response.status < 500,  # Allow auth errors
                    'doc_url': config['doc_url'],
                    'expected_models': config['expected_models']
                }
                
                if result['accessible']:
                    print(f"✅ {config['name']}: {response.status} ({response_time:.0f}ms)")
                else:
                    print(f"❌ {config['name']}: {response.status} ({response_time:.0f}ms)")
                
                return result
                
    except asyncio.TimeoutError:
        print(f"⏰ {config['name']}: Timeout")
        return {
            'provider': provider_id,
            'name': config['name'],
            'status_code': 408,
            'response_time_ms': 10000,
            'accessible': False,
            'error': 'Timeout',
            'doc_url': config['doc_url'],
            'expected_models': config['expected_models']
        }
    except Exception as e:
        print(f"❌ {config['name']}: {str(e)[:50]}")
        return {
            'provider': provider_id,
            'name': config['name'],
            'status_code': 0,
            'response_time_ms': 0,
            'accessible': False,
            'error': str(e),
            'doc_url': config['doc_url'],
            'expected_models': config['expected_models']
        }

async def check_all_providers():
    """Check all providers concurrently"""
    print("🚀 Starting provider health check...\n")
    
    tasks = []
    for provider_id, config in PROVIDERS_TO_CHECK.items():
        tasks.append(check_provider_endpoint(provider_id, config))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results
    valid_results = []
    for result in results:
        if isinstance(result, dict):
            valid_results.append(result)
    
    return valid_results

def generate_report(results):
    """Generate comprehensive report"""
    print("\n" + "="*60)
    print("🔍 PROVIDER VALIDATION REPORT")
    print("="*60)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Providers Checked: {len(results)}")
    
    # Summary stats
    accessible = sum(1 for r in results if r.get('accessible', False))
    avg_response_time = sum(r.get('response_time_ms', 0) for r in results if r.get('accessible', False)) / max(accessible, 1)
    
    print(f"\n📊 SUMMARY")
    print(f"Accessible APIs: {accessible}/{len(results)}")
    print(f"Average Response Time: {avg_response_time:.0f}ms")
    
    # Detailed results
    print(f"\n📋 DETAILED RESULTS")
    print("-" * 40)
    
    for result in sorted(results, key=lambda x: x.get('response_time_ms', 9999)):
        status = "✅" if result.get('accessible') else "❌"
        name = result.get('name', 'Unknown')
        status_code = result.get('status_code', 0)
        response_time = result.get('response_time_ms', 0)
        
        print(f"{status} {name}")
        print(f"   Status: {status_code} ({response_time:.0f}ms)")
        print(f"   Doc URL: {result.get('doc_url', 'N/A')}")
        
        expected = result.get('expected_models', [])
        if expected:
            print(f"   Expected Models: {', '.join(expected[:3])}{'...' if len(expected) > 3 else ''}")
        
        if 'error' in result:
            print(f"   Error: {result['error']}")
        
        print()
    
    # Recommendations
    print("💡 RECOMMENDATIONS")
    print("-" * 25)
    
    inaccessible = [r for r in results if not r.get('accessible', False)]
    if inaccessible:
        print(f"1. {len(inaccessible)} providers need API key authentication:")
        for r in inaccessible[:5]:
            print(f"   - {r.get('name')}: Check API key requirements")
    
    print("2. Set up monitoring for accessible endpoints")
    print("3. Implement model discovery for accessible APIs")
    print("4. Create automated sync process for model updates")
    
    return results

def save_results(results):
    """Save results to JSON file"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"provider_check_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'results': results,
            'summary': {
                'total_providers': len(results),
                'accessible_providers': sum(1 for r in results if r.get('accessible', False)),
                'average_response_time_ms': sum(r.get('response_time_ms', 0) for r in results if r.get('accessible', False)) / max(sum(1 for r in results if r.get('accessible', False)), 1)
            }
        }, f, indent=2)
    
    print(f"💾 Results saved to: {filename}")
    return filename

async def main():
    """Main execution"""
    results = await check_all_providers()
    generate_report(results)
    save_results(results)
    
    print(f"\n🎯 NEXT STEPS")
    print("1. Set up API keys for accessible providers")
    print("2. Run model discovery on accessible endpoints")
    print("3. Create automated validation pipeline")
    print("4. Monitor for new model releases")

if __name__ == "__main__":
    asyncio.run(main())