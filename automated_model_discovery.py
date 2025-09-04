#!/usr/bin/env python3
"""
Automated Model Discovery & Sync System
=======================================

Comprehensive system to discover new models from provider documentation,
validate against current catalog, and generate automated updates.

Features:
- Web scraping of provider documentation pages
- Model pattern recognition and extraction
- Pricing and capability information discovery
- Automated catalog generation
- Change detection and reporting
"""

import requests
import asyncio
import aiohttp
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DiscoveredModel:
    """Model information discovered from provider sources"""
    name: str
    provider: str
    max_tokens: Optional[int] = None
    context_window: Optional[int] = None
    input_price: Optional[float] = None  # per million tokens
    output_price: Optional[float] = None  # per million tokens
    supports_images: bool = False
    supports_prompt_cache: bool = False
    supports_computer_use: bool = False
    description: str = ""
    source_url: str = ""
    confidence_score: float = 0.0  # 0-1 based on extraction quality

class ModelDiscoveryEngine:
    """Main engine for automated model discovery"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # Provider-specific discovery configurations
        self.discovery_configs = {
            'openai': {
                'doc_urls': [
                    'https://platform.openai.com/docs/models/overview',
                    'https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo',
                    'https://platform.openai.com/docs/models/gpt-3-5'
                ],
                'model_patterns': [
                    r'gpt-4o(?:-\d{4}-\d{2}-\d{2})?(?:-preview)?',
                    r'gpt-4(?:-turbo)?(?:-\d{4}-\d{2}-\d{2})?(?:-preview)?',
                    r'gpt-3\.5-turbo(?:-\d{4}-\d{2}-\d{2})?'
                ],
                'selectors': {
                    'model_names': ['h3', 'h4', 'strong'],
                    'descriptions': ['p', 'div.description'],
                    'pricing': ['.pricing', '.cost', '[data-price]']
                }
            },
            
            'anthropic': {
                'doc_urls': [
                    'https://docs.anthropic.com/claude/docs/models-overview',
                    'https://www.anthropic.com/news/claude-3-family'
                ],
                'model_patterns': [
                    r'claude-3(?:\.5)?-(?:opus|sonnet|haiku)(?:-\d{8})?',
                    r'claude-4(?:-\w+)?(?:-\d{8})?'
                ],
                'selectors': {
                    'model_names': ['h2', 'h3', '.model-name'],
                    'descriptions': ['.model-description', 'p'],
                    'pricing': ['.pricing-table', '.cost-info']
                }
            },
            
            'google': {
                'doc_urls': [
                    'https://ai.google.dev/gemini-api/docs/models/gemini',
                    'https://deepmind.google/technologies/gemini/',
                    'https://blog.google/technology/ai/google-gemini-ai/'
                ],
                'model_patterns': [
                    r'gemini-1\.5-(?:pro|flash)(?:-\d{3})?',
                    r'gemini-(?:ultra|pro|nano)(?:-vision)?'
                ],
                'selectors': {
                    'model_names': ['h1', 'h2', 'h3'],
                    'descriptions': ['.description', 'p'],
                    'pricing': ['.pricing', '.rate']
                }
            },
            
            'xai': {
                'doc_urls': [
                    'https://docs.x.ai/docs',
                    'https://x.ai/blog/grok-reasoning',
                    'https://x.ai/'
                ],
                'model_patterns': [
                    r'grok-(?:4|3|2|1)(?:-beta)?(?:-vision)?',
                    r'grok-(?:reasoning|coding|chat)'
                ],
                'selectors': {
                    'model_names': ['h1', 'h2', '.model-title'],
                    'descriptions': ['.model-desc', 'p'],
                    'pricing': ['.pricing-info', '.cost']
                }
            },
            
            'mistral': {
                'doc_urls': [
                    'https://docs.mistral.ai/getting-started/models/',
                    'https://mistral.ai/news/',
                    'https://mistral.ai/technology/'
                ],
                'model_patterns': [
                    r'mistral-(?:large|medium|small)(?:-latest)?(?:-\d{4}-\d{2})?',
                    r'codestral(?:-latest)?',
                    r'mixtral-8x7b(?:-instruct)?'
                ],
                'selectors': {
                    'model_names': ['h2', 'h3', '.model-name'],
                    'descriptions': ['.description', 'p'],
                    'pricing': ['.pricing-section', '.price']
                }
            },
            
            'groq': {
                'doc_urls': [
                    'https://console.groq.com/docs/models',
                    'https://wow.groq.com/news/',
                    'https://groq.com/'
                ],
                'model_patterns': [
                    r'llama-3(?:\.1)?-(?:70b|8b)(?:-versatile|?-instant)?',
                    r'mixtral-8x7b-32768',
                    r'gemma-(?:7b|2b)-it'
                ],
                'selectors': {
                    'model_names': ['h3', 'h4', '.model-card h3'],
                    'descriptions': ['.model-description', 'p'],
                    'pricing': ['.speed-info', '.performance']
                }
            },
            
            'deepseek': {
                'doc_urls': [
                    'https://platform.deepseek.com/api-docs/api/create-chat-completion',
                    'https://deepseek.com/',
                    'https://arxiv.org/search/?query=deepseek&searchtype=all'
                ],
                'model_patterns': [
                    r'deepseek-(?:chat|coder|math)(?:-v2)?',
                    r'deepseek-r1(?:-\w+)?'
                ],
                'selectors': {
                    'model_names': ['h2', 'h3', '.model-name'],
                    'descriptions': ['.model-info', 'p'],
                    'pricing': ['.pricing', '.cost-table']
                }
            },
            
            'perplexity': {
                'doc_urls': [
                    'https://docs.perplexity.ai/docs/model-cards',
                    'https://blog.perplexity.ai/',
                    'https://www.perplexity.ai/'
                ],
                'model_patterns': [
                    r'llama-3\.1-sonar-(?:small|large|huge)-(?:128k|32k)(?:-online)?',
                    r'pplx-(?:7b|70b)(?:-online|?-chat)?'
                ],
                'selectors': {
                    'model_names': ['h1', 'h2', '.model-card-title'],
                    'descriptions': ['.model-description', '.card-body'],
                    'pricing': ['.pricing-info', '.rate']
                }
            }
        }
        
        self.discovered_models = {}
    
    async def discover_models_for_provider(self, provider_id: str) -> List[DiscoveredModel]:
        """Discover models for a specific provider"""
        if provider_id not in self.discovery_configs:
            logger.warning(f"No discovery config for provider: {provider_id}")
            return []
        
        config = self.discovery_configs[provider_id]
        all_models = []
        
        logger.info(f"🔍 Discovering models for {provider_id}...")
        
        for doc_url in config['doc_urls']:
            try:
                models = await self.scrape_models_from_page(provider_id, doc_url, config)
                all_models.extend(models)
                logger.info(f"📄 Found {len(models)} models from {doc_url}")
            except Exception as e:
                logger.error(f"❌ Error scraping {doc_url}: {e}")
        
        # Remove duplicates while keeping highest confidence scores
        unique_models = {}
        for model in all_models:
            if model.name not in unique_models or model.confidence_score > unique_models[model.name].confidence_score:
                unique_models[model.name] = model
        
        result = list(unique_models.values())
        logger.info(f"✅ {provider_id}: Discovered {len(result)} unique models")
        return result
    
    async def scrape_models_from_page(self, provider_id: str, url: str, config: Dict) -> List[DiscoveredModel]:
        """Scrape models from a single documentation page"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status != 200:
                        logger.warning(f"⚠️ {url} returned {response.status}")
                        return []
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    models = []
                    
                    # Method 1: Pattern-based extraction from text content
                    text_content = soup.get_text()
                    for pattern in config['model_patterns']:
                        matches = re.findall(pattern, text_content, re.IGNORECASE)
                        for match in matches:
                            models.append(DiscoveredModel(
                                name=match,
                                provider=provider_id,
                                description=f"Discovered from {url}",
                                source_url=url,
                                confidence_score=0.7
                            ))
                    
                    # Method 2: Structured extraction using selectors
                    for selector in config['selectors']['model_names']:
                        elements = soup.select(selector)
                        for element in elements:
                            text = element.get_text().strip()
                            
                            # Check if text matches any model pattern
                            for pattern in config['model_patterns']:
                                match = re.search(pattern, text, re.IGNORECASE)
                                if match:
                                    # Try to extract additional info from nearby elements
                                    description = self.extract_description(element)
                                    pricing_info = self.extract_pricing_info(element)
                                    
                                    model = DiscoveredModel(
                                        name=match.group(0),
                                        provider=provider_id,
                                        description=description,
                                        source_url=url,
                                        confidence_score=0.9
                                    )
                                    
                                    if pricing_info:
                                        model.input_price = pricing_info.get('input_price')
                                        model.output_price = pricing_info.get('output_price')
                                    
                                    models.append(model)
                    
                    return models
                    
        except Exception as e:
            logger.error(f"❌ Error scraping {url}: {e}")
            return []
    
    def extract_description(self, element) -> str:
        """Extract description from nearby elements"""
        # Look for description in sibling or parent elements
        description = ""
        
        # Try next sibling
        next_sibling = element.find_next_sibling(['p', 'div', 'span'])
        if next_sibling:
            description = next_sibling.get_text().strip()[:200]
        
        # Try parent description
        if not description:
            parent = element.find_parent(['div', 'section'])
            if parent:
                desc_elem = parent.find(['p', '.description', '.model-desc'])
                if desc_elem:
                    description = desc_elem.get_text().strip()[:200]
        
        return description
    
    def extract_pricing_info(self, element) -> Optional[Dict[str, float]]:
        """Extract pricing information from nearby elements"""
        # Look for pricing patterns in nearby text
        pricing_text = ""
        
        # Search in parent container
        container = element.find_parent(['div', 'section', 'article'])
        if container:
            pricing_text = container.get_text()
        
        # Extract pricing with regex patterns
        pricing = {}
        
        # Look for common pricing formats
        input_price_match = re.search(r'input.*?\$?([\d.]+).*?(?:per|/)\s*(?:million|1M|M)', pricing_text, re.IGNORECASE)
        output_price_match = re.search(r'output.*?\$?([\d.]+).*?(?:per|/)\s*(?:million|1M|M)', pricing_text, re.IGNORECASE)
        
        if input_price_match:
            pricing['input_price'] = float(input_price_match.group(1))
        
        if output_price_match:
            pricing['output_price'] = float(output_price_match.group(1))
        
        return pricing if pricing else None
    
    async def discover_all_providers(self) -> Dict[str, List[DiscoveredModel]]:
        """Discover models for all configured providers"""
        logger.info("🚀 Starting comprehensive model discovery...")
        
        tasks = []
        for provider_id in self.discovery_configs.keys():
            tasks.append(self.discover_models_for_provider(provider_id))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_discoveries = {}
        for i, result in enumerate(results):
            provider_id = list(self.discovery_configs.keys())[i]
            if isinstance(result, Exception):
                logger.error(f"❌ Error discovering models for {provider_id}: {result}")
                all_discoveries[provider_id] = []
            else:
                all_discoveries[provider_id] = result
        
        return all_discoveries
    
    def compare_with_current_catalog(self, discovered: Dict[str, List[DiscoveredModel]]) -> Dict[str, Any]:
        """Compare discovered models with current catalog"""
        # This would load the current providers.ts and compare
        # For now, return summary statistics
        
        total_discovered = sum(len(models) for models in discovered.values())
        providers_with_models = len([p for p in discovered if discovered[p]])
        
        comparison = {
            'total_discovered': total_discovered,
            'providers_with_models': providers_with_models,
            'discoveries_by_provider': {p: len(models) for p, models in discovered.items()},
            'new_models_found': [],  # Would be populated by actual comparison
            'missing_models': [],     # Would be populated by actual comparison
            'updated_models': []      # Would be populated by actual comparison
        }
        
        return comparison
    
    def generate_catalog_update(self, discoveries: Dict[str, List[DiscoveredModel]]) -> str:
        """Generate TypeScript code for catalog updates"""
        timestamp = datetime.now().strftime('%Y-%m-%d')
        
        code = []
        code.append(f"// Automated Model Discovery Results - {timestamp}")
        code.append("// Generated by automated_model_discovery.py")
        code.append("")
        code.append("export const DISCOVERED_MODELS = {")
        
        for provider_id, models in discoveries.items():
            if not models:
                continue
                
            code.append(f"  '{provider_id}': [")
            for model in models:
                code.append(f"    // {model.description[:50]}...")
                code.append(f"    // Source: {model.source_url}")
                code.append(f"    // Confidence: {model.confidence_score}")
                code.append(f"    '{model.name}',")
            code.append(f"  ], // {len(models)} models")
            code.append("")
        
        code.append("};")
        code.append("")
        code.append(f"// Total discovered: {sum(len(models) for models in discoveries.values())} models")
        code.append(f"// Providers with models: {len([p for p in discoveries if discoveries[p]])}")
        
        return "\n".join(code)
    
    def save_results(self, discoveries: Dict[str, List[DiscoveredModel]]) -> str:
        """Save discovery results to JSON file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"model_discovery_{timestamp}.json"
        
        # Convert to JSON-serializable format
        json_data = {
            'timestamp': datetime.now().isoformat(),
            'discoveries': {}
        }
        
        for provider_id, models in discoveries.items():
            json_data['discoveries'][provider_id] = [asdict(model) for model in models]
        
        with open(filename, 'w') as f:
            json.dump(json_data, f, indent=2)
        
        logger.info(f"💾 Discovery results saved to: {filename}")
        return filename

async def main():
    """Main discovery workflow"""
    engine = ModelDiscoveryEngine()
    
    # Run comprehensive discovery
    discoveries = await engine.discover_all_providers()
    
    # Generate comparison with current catalog
    comparison = engine.compare_with_current_catalog(discoveries)
    
    # Generate reports
    total_models = sum(len(models) for models in discoveries.values())
    providers_with_models = len([p for p in discoveries if discoveries[p]])
    
    print(f"\n🔍 MODEL DISCOVERY RESULTS")
    print("=" * 50)
    print(f"Providers Scanned: {len(discoveries)}")
    print(f"Providers with Models: {providers_with_models}")
    print(f"Total Models Discovered: {total_models}")
    print()
    
    print("📊 BY PROVIDER:")
    print("-" * 30)
    for provider_id, models in discoveries.items():
        if models:
            print(f"✅ {provider_id}: {len(models)} models")
            # Show top 3 models
            for model in models[:3]:
                print(f"   - {model.name} (confidence: {model.confidence_score})")
            if len(models) > 3:
                print(f"   ... and {len(models) - 3} more")
        else:
            print(f"❌ {provider_id}: No models discovered")
    
    # Save results
    results_file = engine.save_results(discoveries)
    
    # Generate catalog update code
    catalog_code = engine.generate_catalog_update(discoveries)
    catalog_file = f"discovered_models_{datetime.now().strftime('%Y%m%d')}.ts"
    with open(catalog_file, 'w') as f:
        f.write(catalog_code)
    
    print(f"\n📁 FILES GENERATED:")
    print(f"- {results_file} (JSON results)")
    print(f"- {catalog_file} (TypeScript catalog)")
    
    print(f"\n🤖 AUTOMATION RECOMMENDATIONS:")
    print("1. Schedule this script to run weekly")
    print("2. Compare results with current catalog")
    print("3. Generate automated PRs for new models")
    print("4. Set up alerts for significant changes")
    print("5. Implement confidence scoring for quality control")

if __name__ == "__main__":
    asyncio.run(main())