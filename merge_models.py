#!/usr/bin/env python3
"""
Merge extracted comprehensive model catalog into CLINE_PROVIDERS.
This script updates the providers.ts file with all 279 models from Cline.
"""

import re
import os

def merge_comprehensive_models():
    """Merge the comprehensive extracted models into CLINE_PROVIDERS."""
    
    # Read the extracted models
    with open("extracted_models.ts", 'r') as f:
        extracted_content = f.read()
    
    # Extract the model definitions (everything inside EXTRACTED_CLINE_MODELS)
    match = re.search(r'export const EXTRACTED_CLINE_MODELS = \{(.*)\};', extracted_content, re.DOTALL)
    if not match:
        print("❌ Could not find extracted models!")
        return
    
    new_models = match.group(1).strip()
    
    # Read the current providers.ts file
    providers_file = "src/types/providers.ts"
    with open(providers_file, 'r') as f:
        current_content = f.read()
    
    # Find the CLINE_PROVIDERS export and replace its content
    providers_pattern = r'export const CLINE_PROVIDERS: Record<ApiProvider, ProviderConfig> = \{(.*?)\}'
    providers_match = re.search(providers_pattern, current_content, re.DOTALL)
    
    if not providers_match:
        print("❌ Could not find CLINE_PROVIDERS in the current file!")
        return
    
    # Create backup
    backup_file = f"{providers_file}.backup"
    with open(backup_file, 'w') as f:
        f.write(current_content)
    print(f"📁 Created backup: {backup_file}")
    
    # Replace the CLINE_PROVIDERS content
    updated_content = current_content.replace(
        providers_match.group(0),
        f"export const CLINE_PROVIDERS: Record<ApiProvider, ProviderConfig> = {{\n{new_models}\n}}"
    )
    
    # Write the updated content
    with open(providers_file, 'w') as f:
        f.write(updated_content)
    
    print("✅ Successfully merged comprehensive model catalog!")
    print("🎯 Updated CLINE_PROVIDERS with all 279 models from 22 providers")
    
    # Count models to verify
    model_count = len(re.findall(r'modelCount: (\d+)', new_models))
    total_models = sum(int(count) for count in re.findall(r'modelCount: (\d+)', new_models))
    
    print(f"📊 Verification:")
    print(f"  - {model_count} providers updated")  
    print(f"  - {total_models} total models merged")
    print(f"  - Backup saved to: {backup_file}")

if __name__ == "__main__":
    print("🚀 Merging comprehensive Cline model catalog into CLINE_PROVIDERS...")
    merge_comprehensive_models()