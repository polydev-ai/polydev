#!/usr/bin/env python3
"""
Extract all models from Cline's comprehensive catalog and convert to CLINE_PROVIDERS format.
This script parses the downloaded Cline api.ts file and generates TypeScript model definitions.
"""

import re
import json
from typing import Dict, Any, List

def extract_model_catalog(file_path: str) -> Dict[str, Dict[str, Any]]:
    """Extract all model catalogs from Cline's api.ts file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Find all model catalog definitions - comprehensive extraction
    catalogs = {}
    
    # STEP 1: Auto-discover all model catalogs in the file
    import re
    discovered_catalogs = re.findall(r'export const (\w+Models) = \{', content)
    print(f"🔍 Auto-discovered {len(discovered_catalogs)} model catalogs in Cline:")
    for catalog in discovered_catalogs:
        print(f"  - {catalog}")
    
    # Map of ALL Cline catalog names to our provider names (matching ApiProvider type)
    catalog_mapping = {
        'anthropicModels': 'anthropic',
        'claudeCodeModels': 'claude-code',
        'bedrockModels': 'bedrock',
        'vertexModels': 'vertex', 
        'geminiModels': 'gemini',
        'openAiNativeModels': 'openai',
        'deepSeekModels': 'deepseek',
        'huggingFaceModels': 'huggingface',
        'internationalQwenModels': 'qwen',
        'mainlandQwenModels': 'qwen',  # Merge mainland and international qwen
        'doubaoModels': 'doubao',
        'mistralModels': 'mistral',
        'askSageModels': 'asksage',
        'nebiusModels': 'nebius',
        'xaiModels': 'xai',
        'sambanovaModels': 'sambanova',
        'cerebrasModels': 'cerebras',
        'groqModels': 'groq',
        'sapAiCoreModels': 'sapaicore',
        'moonshotModels': 'moonshot',
        'huaweiCloudMaasModels': 'huawei-cloud-maas',
        'basetenModels': 'baseten',
        'internationalZAiModels': 'zai',
        'mainlandZAiModels': 'zai',  # Merge mainland and international zai
        'fireworksModels': 'fireworks',
        'qwenCodeModels': 'qwen-code'
    }
    
    # Add any newly discovered catalogs that we don't have mapped
    for catalog in discovered_catalogs:
        if catalog not in catalog_mapping:
            # Try to map to provider name automatically
            provider_name = catalog.lower().replace('models', '').replace('international', '').replace('mainland', '')
            if provider_name not in catalog_mapping.values():
                catalog_mapping[catalog] = provider_name
                print(f"  ✨ Auto-mapping new catalog: {catalog} -> {provider_name}")
    
    print(f"📊 Total catalogs to process: {len(catalog_mapping)}")
    
    # Extract each catalog
    for cline_name, our_name in catalog_mapping.items():
        # More flexible pattern to handle different const endings
        pattern = rf'export const {cline_name} = \{{(.*?)\}} as const(?:\s+satisfies\s+[^;]+)?'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            models = parse_model_object(match.group(1))
            if models:  # Only add if we found models
                if our_name in catalogs:
                    # Merge models for providers with multiple catalogs (qwen, zai)
                    catalogs[our_name].update(models)
                    print(f"  ✓ Merged {cline_name} into {our_name}: +{len(models)} models (total: {len(catalogs[our_name])})")
                else:
                    catalogs[our_name] = models
                    print(f"  ✓ Found {our_name}: {len(models)} models")
    
    return catalogs

def parse_model_object(model_text: str) -> Dict[str, Any]:
    """Parse a TypeScript model object into Python dict with improved nested parsing."""
    models = {}
    
    # Split into lines and find model blocks more carefully
    lines = model_text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        # Look for model name pattern with quotes
        match = re.match(r'^\s*"([^"]+)":\s*\{\s*$', line)
        if match:
            model_name = match.group(1)
            i += 1
            
            # Collect all properties until we find the matching closing brace
            props_lines = []
            brace_count = 1
            
            while i < len(lines) and brace_count > 0:
                current_line = lines[i]
                props_lines.append(current_line)
                
                # Count braces to find the end of this model object
                brace_count += current_line.count('{') - current_line.count('}')
                i += 1
            
            # Remove the last closing brace line
            if props_lines and '}' in props_lines[-1]:
                props_lines[-1] = props_lines[-1].replace('}', '', 1).rstrip()
                if not props_lines[-1].strip():
                    props_lines.pop()
            
            # Parse the collected properties
            props_text = '\n'.join(props_lines)
            model_data = parse_model_properties(props_text)
            models[model_name] = model_data
        else:
            i += 1
    
    return models

def parse_model_properties(props_text: str) -> Dict[str, Any]:
    """Parse model properties from TypeScript object."""
    props = {}
    
    # Parse common properties
    prop_patterns = [
        (r'maxTokens:\s*([0-9_,]+)', 'maxTokens', int),
        (r'contextWindow:\s*([0-9_,]+)', 'contextWindow', int),
        (r'inputPrice:\s*([0-9.]+)', 'inputPrice', float),
        (r'outputPrice:\s*([0-9.]+)', 'outputPrice', float),
        (r'cacheReadsPrice:\s*([0-9.]+)', 'cacheReadsPrice', float),
        (r'cacheWritesPrice:\s*([0-9.]+)', 'cacheWritesPrice', float),
        (r'supportsImages:\s*(true|false)', 'supportsImages', lambda x: x == 'true'),
        (r'supportsPromptCache:\s*(true|false)', 'supportsPromptCache', lambda x: x == 'true'),
        (r'supportsComputerUse:\s*(true|false)', 'supportsComputerUse', lambda x: x == 'true'),
        (r'description:\s*"([^"]*)"', 'description', str),
    ]
    
    for pattern, key, converter in prop_patterns:
        match = re.search(pattern, props_text)
        if match:
            value = match.group(1)
            if converter == int:
                # Handle underscores in numbers
                value = value.replace('_', '').replace(',', '')
                props[key] = int(value)
            elif converter == float:
                props[key] = float(value)
            else:
                props[key] = converter(value)
    
    return props

def get_provider_config(provider: str) -> Dict[str, Any]:
    """Get configuration for each provider."""
    configs = {
        "anthropic": {
            "name": "Anthropic",
            "description": "Claude models with superior reasoning and safety",
            "category": "api",
            "authType": "api_key",
            "baseUrl": "https://api.anthropic.com",
            "tags": ["reasoning", "safety", "tools", "vision"],
            "tier": "premium",
            "supportsStreaming": True,
            "supportsTools": True,
            "supportsVision": True,
            "supportsReasoning": True,
            "supportsPromptCaching": True,
        },
        "openai": {
            "name": "OpenAI",
            "description": "GPT models with comprehensive capabilities",
            "category": "api",
            "authType": "api_key",
            "baseUrl": "https://api.openai.com/v1",
            "tags": ["versatile", "tools", "vision", "reasoning"],
            "tier": "premium",
            "supportsStreaming": True,
            "supportsTools": True,
            "supportsVision": True,
            "supportsReasoning": True,
            "supportsPromptCaching": True,
        },
        "gemini": {
            "name": "Google Gemini",
            "description": "Multimodal models with massive context windows",
            "category": "api",
            "authType": "api_key",
            "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
            "tags": ["multimodal", "large-context", "tools", "vision"],
            "tier": "premium",
            "supportsStreaming": True,
            "supportsTools": True,
            "supportsVision": True,
            "supportsReasoning": True,
            "supportsPromptCaching": False,
        },
        "xai": {
            "name": "xAI",
            "description": "Grok models with real-time information access",
            "category": "api",
            "authType": "api_key",
            "baseUrl": "https://api.x.ai/v1",
            "tags": ["real-time", "reasoning", "current-events"],
            "tier": "premium",
            "supportsStreaming": True,
            "supportsTools": True,
            "supportsVision": True,
            "supportsReasoning": True,
            "supportsPromptCaching": False,
        },
        "deepseek": {
            "name": "DeepSeek",
            "description": "Advanced reasoning models from DeepSeek",
            "category": "api",
            "authType": "api_key",
            "baseUrl": "https://api.deepseek.com/v1",
            "tags": ["reasoning", "code", "efficient"],
            "tier": "premium",
            "supportsStreaming": True,
            "supportsTools": True,
            "supportsVision": False,
            "supportsReasoning": True,
            "supportsPromptCaching": True,
        },
        "groq": {
            "name": "Groq",
            "description": "Ultra-fast inference with GroqChip technology",
            "category": "api",
            "authType": "api_key",
            "baseUrl": "https://api.groq.com/openai/v1",
            "tags": ["speed", "inference", "llama", "mixtral"],
            "tier": "premium",
            "supportsStreaming": True,
            "supportsTools": True,
            "supportsVision": False,
            "supportsReasoning": False,
            "supportsPromptCaching": False,
        },
    }
    
    # Default configuration for unknown providers
    default_config = {
        "name": provider.title(),
        "description": f"{provider.title()} AI models",
        "category": "api",
        "authType": "api_key",
        "baseUrl": f"https://api.{provider}.com/v1",
        "tags": ["ai", "language-model"],
        "tier": "premium",
        "supportsStreaming": True,
        "supportsTools": False,
        "supportsVision": False,
        "supportsReasoning": False,
        "supportsPromptCaching": False,
    }
    
    return configs.get(provider, default_config)

def generate_typescript_models(catalogs: Dict[str, Dict[str, Any]]) -> str:
    """Generate TypeScript model definitions for CLINE_PROVIDERS."""
    output = []
    
    # First add all providers that have extracted models
    for provider, models in catalogs.items():
        output.append(f"\n  // {provider.upper()} MODELS ({len(models)} total)")
        output.append(f'  "{provider}": {{')
        output.append(f'    id: "{provider}",')
        
        # Provider-specific configurations using a lookup
        provider_configs = get_provider_config(provider)
        for key, value in provider_configs.items():
            if isinstance(value, str):
                output.append(f'    {key}: "{value}",')
            elif isinstance(value, list):
                tags_str = '", "'.join(value)
                output.append(f'    {key}: ["{tags_str}"],')
            elif isinstance(value, bool):
                output.append(f'    {key}: {str(value).lower()},')
            elif isinstance(value, int):
                output.append(f'    {key}: {value},')
        
        # Add model count and default model
        default_model = find_best_model(models)
        output.append(f'    defaultModel: "{default_model}",')
        output.append(f'    modelCount: {len(models)},')
        
        # Add supported models
        output.append('    supportedModels: {')
        
        for model_name, model_data in models.items():
            output.append(f'      "{model_name}": {{')
            
            if 'maxTokens' in model_data:
                output.append(f'        maxTokens: {model_data["maxTokens"]},')
            else:
                output.append('        maxTokens: 8192,')  # Default
            if 'contextWindow' in model_data:
                output.append(f'        contextWindow: {model_data["contextWindow"]},')
            else:
                output.append('        contextWindow: 200000,')  # Default
            
            # Always add pricing (required by ModelInfo interface)
            input_price = model_data.get("inputPrice", 3.0)
            output_price = model_data.get("outputPrice", 15.0)
            output.append(f'        inputPrice: {input_price},')
            output.append(f'        outputPrice: {output_price},')
            
            if 'supportsImages' in model_data:
                output.append(f'        supportsImages: {str(model_data["supportsImages"]).lower()},')
            else:
                output.append('        supportsImages: true,')  # Default
            if 'supportsPromptCache' in model_data:
                output.append(f'        supportsPromptCache: {str(model_data["supportsPromptCache"]).lower()},')
            else:
                output.append('        supportsPromptCache: true,')  # Default
            if 'supportsComputerUse' in model_data:
                output.append(f'        supportsComputerUse: {str(model_data["supportsComputerUse"]).lower()},')
            else:
                output.append('        supportsComputerUse: false,')
            
            description = model_data.get('description', f'{model_name} model')
            output.append(f'        description: "{description}"')
            
            output.append('      },')
        
        output.append('    }')
        output.append('  },')
    
    # Add missing providers that are required by ApiProvider type but not in Cline's catalog
    # Note: claude-code and huawei-cloud-maas are now extracted from Cline
    missing_providers = [
        "openrouter", "ollama", "lmstudio", "openai-native",
        "requesty", "together", "vscode-lm", "cline", "litellm", 
        "dify", "vercel-ai-gateway"
    ]
    
    for provider in missing_providers:
        output.append(f'\n  // {provider.upper()} - PLACEHOLDER (no models extracted)')
        output.append(f'  "{provider}": {{')
        output.append(f'    id: "{provider}",')
        
        config = get_provider_config(provider)
        for key, value in config.items():
            if isinstance(value, str):
                output.append(f'    {key}: "{value}",')
            elif isinstance(value, list):
                tags_str = '", "'.join(value)
                output.append(f'    {key}: ["{tags_str}"],')
            elif isinstance(value, bool):
                output.append(f'    {key}: {str(value).lower()},')
        
        output.append('    defaultModel: "placeholder",')
        output.append('    modelCount: 0,')
        output.append('    supportedModels: {}')
        output.append('  },')
    
    return '\n'.join(output)

def find_best_model(models: Dict[str, Any]) -> str:
    """Find the most advanced/latest model to use as default."""
    # Priority order for model selection
    priority_patterns = [
        r'gpt-5.*latest',
        r'claude.*4',
        r'gemini-2\.5',
        r'gemini-2\.0',
        r'deepseek-chat',
        r'o3$',
        r'gpt-5',
        r'claude.*sonnet.*latest',
        r'gpt-4o',
    ]
    
    for pattern in priority_patterns:
        for model_name in models.keys():
            if re.search(pattern, model_name, re.IGNORECASE):
                return model_name
    
    # Fallback to first model
    return list(models.keys())[0] if models else "unknown"

def main():
    """Main execution function."""
    print("🚀 Extracting ALL models from Cline's latest comprehensive catalog...")
    
    # Extract all model catalogs from the latest file
    cline_file = "/tmp/cline_api_latest.ts"
    catalogs = extract_model_catalog(cline_file)
    
    print(f"📊 Found {len(catalogs)} provider catalogs:")
    for provider, models in catalogs.items():
        print(f"  - {provider}: {len(models)} models")
    
    # Generate TypeScript output
    typescript_output = generate_typescript_models(catalogs)
    
    # Write to output file
    output_file = "/Users/venkat/Documents/jarvis/polydev-website-clean/extracted_models.ts"
    with open(output_file, 'w') as f:
        f.write("// AUTO-GENERATED MODEL CATALOG FROM CLINE\n")
        f.write("// This contains ALL models extracted from Cline's comprehensive catalog\n\n")
        f.write("export const EXTRACTED_CLINE_MODELS = {")
        f.write(typescript_output)
        f.write("\n};\n")
    
    print(f"✅ Generated comprehensive model catalog: {output_file}")
    
    # Print summary statistics
    total_models = sum(len(models) for models in catalogs.values())
    print(f"🎯 TOTAL MODELS EXTRACTED: {total_models}")
    print("\nNow you can copy these model definitions into your CLINE_PROVIDERS!")

if __name__ == "__main__":
    main()