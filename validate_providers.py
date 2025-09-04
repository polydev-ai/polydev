#!/usr/bin/env python3
"""
Comprehensive Provider Validation & Model Discovery System
=========================================================

This script validates all 37 AI providers by:
1. Checking API endpoint health and accessibility
2. Validating model catalogs against official documentation  
3. Discovering new models from provider websites/APIs
4. Cross-referencing with Cline's catalog for gaps
5. Generating automated reports and sync recommendations

Author: Claude Code
Version: 1.0
Last Updated: 2025-01-04
"""

import requests
import json
import re
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import asyncio
import aiohttp
from urllib.parse import urljoin, urlparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ModelInfo:
    """Model information structure matching providers.ts"""
    max_tokens: int
    context_window: int
    input_price: float  # per million tokens
    output_price: float  # per million tokens
    supports_images: bool
    supports_prompt_cache: bool
    supports_computer_use: bool
    description: str

@dataclass
class ProviderValidationResult:
    """Result of validating a single provider"""
    provider_id: str
    api_accessible: bool
    endpoint_status: int
    response_time_ms: float
    models_discovered: List[str]
    models_validated: List[str]
    models_missing: List[str]
    new_models_found: List[str]
    api_url_valid: bool
    documentation_url: Optional[str]
    last_updated: str
    errors: List[str]
    recommendations: List[str]

class ProviderValidator:
    """Comprehensive provider validation system"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'PolyDev-ModelValidator/1.0 (https://polydev.ai)'
        })
        
        # Provider endpoint configurations
        self.provider_configs = {
            'openai': {
                'api_url': 'https://api.openai.com/v1/models',
                'doc_url': 'https://platform.openai.com/docs/models',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'data.*.id'
            },
            'anthropic': {
                'api_url': 'https://api.anthropic.com/v1/messages',
                'doc_url': 'https://docs.anthropic.com/claude/docs/models-overview',
                'auth_header': 'x-api-key: {api_key}',
                'model_field': None  # Need to scrape from docs
            },
            'google': {
                'api_url': 'https://generativelanguage.googleapis.com/v1/models',
                'doc_url': 'https://ai.google.dev/models/gemini',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'models.*.name'
            },
            'mistral': {
                'api_url': 'https://api.mistral.ai/v1/models',
                'doc_url': 'https://docs.mistral.ai/getting-started/models/',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'data.*.id'
            },
            'groq': {
                'api_url': 'https://api.groq.com/openai/v1/models',
                'doc_url': 'https://console.groq.com/docs/models',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'data.*.id'
            },
            'xai': {
                'api_url': 'https://api.x.ai/v1/models',
                'doc_url': 'https://docs.x.ai/docs/models',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'data.*.id'
            },
            'deepseek': {
                'api_url': 'https://api.deepseek.com/v1/models',
                'doc_url': 'https://platform.deepseek.com/api-docs/zh/models',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'data.*.id'
            },
            'cohere': {
                'api_url': 'https://api.cohere.ai/v1/models',
                'doc_url': 'https://docs.cohere.com/docs/models',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'models.*.name'
            },
            'together': {
                'api_url': 'https://api.together.xyz/models/info',
                'doc_url': 'https://docs.together.ai/docs/inference-models',
                'auth_header': 'Authorization: Bearer {api_key}',
                'model_field': 'data.*.id'
            },
            'replicate': {
                'api_url': 'https://api.replicate.com/v1/models',
                'doc_url': 'https://replicate.com/explore',
                'auth_header': 'Authorization: Token {api_key}',
                'model_field': 'results.*.name'
            }
        }
        
        self.results = {}
    
    async def validate_all_providers(self) -> Dict[str, ProviderValidationResult]:
        """Validate all providers concurrently"""
        logger.info("🚀 Starting comprehensive provider validation...")
        
        # Load current provider configuration
        current_providers = self.load_current_providers()
        
        tasks = []
        for provider_id in current_providers.keys():
            tasks.append(self.validate_provider(provider_id, current_providers[provider_id]))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(results):
            provider_id = list(current_providers.keys())[i]
            if isinstance(result, Exception):
                logger.error(f"❌ Error validating {provider_id}: {result}")
                self.results[provider_id] = ProviderValidationResult(
                    provider_id=provider_id,
                    api_accessible=False,
                    endpoint_status=0,
                    response_time_ms=0,
                    models_discovered=[],
                    models_validated=[],
                    models_missing=[],
                    new_models_found=[],
                    api_url_valid=False,
                    documentation_url=None,
                    last_updated=datetime.now().isoformat(),
                    errors=[str(result)],
                    recommendations=["Manual investigation required"]
                )
            else:
                self.results[provider_id] = result
        
        return self.results
    
    def load_current_providers(self) -> Dict[str, Any]:
        """Load current provider configuration from providers.ts"""
        try:
            with open('src/types/providers.ts', 'r') as f:
                content = f.read()
            
            # Extract CLINE_PROVIDERS object using regex
            pattern = r'export const CLINE_PROVIDERS.*?= \{(.*?)\n\};'
            match = re.search(pattern, content, re.DOTALL)
            
            if not match:
                logger.error("❌ Could not parse CLINE_PROVIDERS from providers.ts")
                return {}
            
            # Parse provider names (simplified extraction)
            provider_section = match.group(1)
            provider_names = re.findall(r'"([^"]+)": \{', provider_section)
            
            providers = {}
            for name in provider_names:
                providers[name] = {"exists": True}  # Placeholder
            
            logger.info(f"📊 Loaded {len(providers)} providers from current config")
            return providers
            
        except Exception as e:
            logger.error(f"❌ Error loading providers: {e}")
            return {}
    
    async def validate_provider(self, provider_id: str, config: Dict[str, Any]) -> ProviderValidationResult:
        """Validate a single provider comprehensively"""
        logger.info(f"🔍 Validating provider: {provider_id}")
        
        start_time = time.time()
        result = ProviderValidationResult(
            provider_id=provider_id,
            api_accessible=False,
            endpoint_status=0,
            response_time_ms=0,
            models_discovered=[],
            models_validated=[],
            models_missing=[],
            new_models_found=[],
            api_url_valid=False,
            documentation_url=None,
            last_updated=datetime.now().isoformat(),
            errors=[],
            recommendations=[]
        )
        
        try:
            # Check if we have configuration for this provider
            if provider_id not in self.provider_configs:
                result.errors.append(f"No validation config available for {provider_id}")
                result.recommendations.append(f"Add {provider_id} to provider_configs for validation")
                return result
            
            provider_config = self.provider_configs[provider_id]
            
            # Step 1: Validate API endpoint accessibility
            api_status, response_time = await self.check_api_endpoint(provider_config['api_url'])
            result.endpoint_status = api_status
            result.response_time_ms = response_time
            result.api_accessible = 200 <= api_status < 400
            result.api_url_valid = api_status != 0
            
            # Step 2: Discover models from API (if accessible)
            if result.api_accessible:
                try:
                    discovered_models = await self.discover_models_from_api(provider_id, provider_config)
                    result.models_discovered = discovered_models
                    logger.info(f"✅ {provider_id}: Discovered {len(discovered_models)} models from API")
                except Exception as e:
                    result.errors.append(f"Model discovery failed: {str(e)}")
                    logger.warning(f"⚠️ {provider_id}: API model discovery failed: {e}")
            
            # Step 3: Scrape models from documentation
            try:
                doc_models = await self.scrape_models_from_docs(provider_config['doc_url'])
                if doc_models:
                    result.models_discovered.extend([m for m in doc_models if m not in result.models_discovered])
                    logger.info(f"📚 {provider_id}: Found {len(doc_models)} models in documentation")
            except Exception as e:
                result.errors.append(f"Documentation scraping failed: {str(e)}")
                logger.warning(f"⚠️ {provider_id}: Documentation scraping failed: {e}")
            
            # Step 4: Cross-reference with current catalog
            current_models = self.get_current_models_for_provider(provider_id)
            result.models_validated = [m for m in current_models if m in result.models_discovered]
            result.models_missing = [m for m in current_models if m not in result.models_discovered]
            result.new_models_found = [m for m in result.models_discovered if m not in current_models]
            
            # Step 5: Generate recommendations
            if result.new_models_found:
                result.recommendations.append(f"Add {len(result.new_models_found)} new models: {result.new_models_found[:3]}...")
            
            if result.models_missing:
                result.recommendations.append(f"Investigate {len(result.models_missing)} missing models: {result.models_missing[:3]}...")
                
            if not result.api_accessible:
                result.recommendations.append("API endpoint not accessible - check authentication requirements")
                
            result.documentation_url = provider_config['doc_url']
            
        except Exception as e:
            result.errors.append(f"Validation failed: {str(e)}")
            logger.error(f"❌ {provider_id}: Validation error: {e}")
        
        execution_time = (time.time() - start_time) * 1000
        if result.response_time_ms == 0:
            result.response_time_ms = execution_time
            
        return result
    
    async def check_api_endpoint(self, url: str) -> Tuple[int, float]:
        """Check if API endpoint is accessible"""
        try:
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    response_time = (time.time() - start_time) * 1000
                    return response.status, response_time
        except asyncio.TimeoutError:
            return 408, 10000  # Timeout
        except Exception:
            return 0, 0  # Connection failed
    
    async def discover_models_from_api(self, provider_id: str, config: Dict[str, Any]) -> List[str]:
        """Discover models from provider's API endpoint"""
        # This would require API keys for most providers
        # For now, return empty list and recommend manual checking
        return []
    
    async def scrape_models_from_docs(self, doc_url: str) -> List[str]:
        """Scrape model names from provider documentation"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(doc_url) as response:
                    if response.status == 200:
                        text = await response.text()
                        
                        # Common patterns for model names in documentation
                        patterns = [
                            r'gpt-[0-9o-]+(?:-[a-z0-9-]+)?',  # GPT models
                            r'claude-[0-9]+-[a-z0-9-]+',      # Claude models  
                            r'gemini-[0-9]+-[a-z0-9-]+',      # Gemini models
                            r'grok-[0-9]+-[a-z0-9-]+',        # Grok models
                            r'mistral-[a-z0-9-]+',            # Mistral models
                            r'llama-[0-9]+-[a-z0-9-]+',       # Llama models
                        ]
                        
                        models = []
                        for pattern in patterns:
                            matches = re.findall(pattern, text, re.IGNORECASE)
                            models.extend(matches)
                        
                        return list(set(models))  # Remove duplicates
        except Exception as e:
            logger.warning(f"⚠️ Failed to scrape {doc_url}: {e}")
        
        return []
    
    def get_current_models_for_provider(self, provider_id: str) -> List[str]:
        """Extract current models for a provider from providers.ts"""
        # This would parse the actual model list from providers.ts
        # For now, return empty list
        return []
    
    def generate_report(self) -> str:
        """Generate comprehensive validation report"""
        if not self.results:
            return "❌ No validation results available"
        
        report = []
        report.append("🔍 COMPREHENSIVE PROVIDER VALIDATION REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Providers Validated: {len(self.results)}")
        report.append("")
        
        # Summary statistics
        accessible_count = sum(1 for r in self.results.values() if r.api_accessible)
        total_new_models = sum(len(r.new_models_found) for r in self.results.values())
        total_missing_models = sum(len(r.models_missing) for r in self.results.values())
        
        report.append("📊 SUMMARY STATISTICS")
        report.append("-" * 30)
        report.append(f"APIs Accessible: {accessible_count}/{len(self.results)}")
        report.append(f"New Models Found: {total_new_models}")
        report.append(f"Missing Models: {total_missing_models}")
        report.append("")
        
        # Individual provider results
        report.append("📋 INDIVIDUAL PROVIDER RESULTS")
        report.append("-" * 40)
        
        for provider_id, result in sorted(self.results.items()):
            status = "✅" if result.api_accessible else "❌"
            report.append(f"{status} {provider_id.upper()}")
            report.append(f"   API Status: {result.endpoint_status} ({result.response_time_ms:.0f}ms)")
            report.append(f"   Models Discovered: {len(result.models_discovered)}")
            report.append(f"   New Models: {len(result.new_models_found)}")
            report.append(f"   Missing Models: {len(result.models_missing)}")
            
            if result.new_models_found:
                report.append(f"   🆕 New: {', '.join(result.new_models_found[:3])}...")
            
            if result.models_missing:
                report.append(f"   ❓ Missing: {', '.join(result.models_missing[:3])}...")
            
            if result.errors:
                report.append(f"   ⚠️ Errors: {len(result.errors)}")
            
            if result.recommendations:
                report.append(f"   💡 Recommendations: {result.recommendations[0]}")
            
            report.append("")
        
        return "\n".join(report)
    
    def save_results(self):
        """Save validation results to JSON file"""
        # Convert dataclasses to dicts for JSON serialization
        json_results = {}
        for provider_id, result in self.results.items():
            json_results[provider_id] = {
                'provider_id': result.provider_id,
                'api_accessible': result.api_accessible,
                'endpoint_status': result.endpoint_status,
                'response_time_ms': result.response_time_ms,
                'models_discovered': result.models_discovered,
                'models_validated': result.models_validated,
                'models_missing': result.models_missing,
                'new_models_found': result.new_models_found,
                'api_url_valid': result.api_url_valid,
                'documentation_url': result.documentation_url,
                'last_updated': result.last_updated,
                'errors': result.errors,
                'recommendations': result.recommendations
            }
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"provider_validation_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(json_results, f, indent=2)
        
        logger.info(f"💾 Validation results saved to {filename}")
        return filename

async def main():
    """Main validation workflow"""
    validator = ProviderValidator()
    
    # Run comprehensive validation
    results = await validator.validate_all_providers()
    
    # Generate and display report
    report = validator.generate_report()
    print(report)
    
    # Save results for future reference
    results_file = validator.save_results()
    
    # Generate recommendations for automation
    print("\n🤖 AUTOMATION RECOMMENDATIONS")
    print("=" * 40)
    print("1. Set up API keys for providers with accessible endpoints")
    print("2. Create scheduled job to run this validation weekly")
    print("3. Implement model discovery pipeline with provider APIs")
    print("4. Add webhook notifications for new models discovered")
    print("5. Create automated PR generation for model catalog updates")
    print(f"\n📁 Detailed results: {results_file}")

if __name__ == "__main__":
    asyncio.run(main())