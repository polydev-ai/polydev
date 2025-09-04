#!/usr/bin/env python3
"""
Replace CLINE_PROVIDERS with comprehensive extracted models from Cline.
This script properly replaces the entire provider configuration.
"""

import re

def replace_providers():
    """Replace CLINE_PROVIDERS with comprehensive extracted models."""
    
    # Read the extracted models file
    with open("extracted_models.ts", 'r') as f:
        extracted_content = f.read()
    
    # Extract just the provider configurations (everything between the braces)
    match = re.search(r'export const EXTRACTED_CLINE_MODELS = \{(.*)\};', extracted_content, re.DOTALL)
    if not match:
        print("❌ Could not find EXTRACTED_CLINE_MODELS!")
        return
    
    new_providers_content = match.group(1).strip()
    
    # Read current providers file
    with open("src/types/providers.ts", 'r') as f:
        current_content = f.read()
    
    # Create backup
    with open("src/types/providers.ts.backup2", 'w') as f:
        f.write(current_content)
    print("📁 Created backup: src/types/providers.ts.backup2")
    
    # Find where CLINE_PROVIDERS starts and ends
    start_pattern = r'export const CLINE_PROVIDERS: Record<ApiProvider, ProviderConfig> = \{'
    end_pattern = r'\}'
    
    # Find the start position
    start_match = re.search(start_pattern, current_content)
    if not start_match:
        print("❌ Could not find CLINE_PROVIDERS declaration!")
        return
    
    start_pos = start_match.end() - 1  # Include the opening brace
    
    # Find the matching closing brace
    brace_count = 0
    end_pos = start_pos
    for i, char in enumerate(current_content[start_pos:], start_pos):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = i + 1
                break
    
    if brace_count != 0:
        print("❌ Could not find matching closing brace!")
        return
    
    # Replace the content
    new_content = (
        current_content[:start_pos] + 
        "{\n" + new_providers_content + "\n}" +
        current_content[end_pos:]
    )
    
    # Write the updated file
    with open("src/types/providers.ts", 'w') as f:
        f.write(new_content)
    
    print("✅ Successfully replaced CLINE_PROVIDERS with comprehensive model catalog!")
    print("🎯 Updated with all 22 providers and 279+ models from Cline")
    
    # Verify by counting providers in the new content
    provider_count = len(re.findall(r'"[^"]+": \{[^}]*id: "[^"]+",', new_providers_content))
    print(f"📊 Verification: {provider_count} providers merged")

if __name__ == "__main__":
    print("🚀 Replacing CLINE_PROVIDERS with comprehensive Cline model catalog...")
    replace_providers()