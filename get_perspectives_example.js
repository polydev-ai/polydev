#!/usr/bin/env node

/**
 * Example script to get perspectives from Polydev API
 * 
 * Usage:
 *   POLYDEV_USER_TOKEN=pd_your_token_here node get_perspectives_example.js
 */

const prompt = "What causes React useEffect infinite loops? Provide a comprehensive explanation covering common causes, examples, and solutions.";

const userToken = process.env.POLYDEV_USER_TOKEN;

if (!userToken) {
  console.error('Error: POLYDEV_USER_TOKEN environment variable is required');
  console.error('Get your token from: https://polydev.ai/dashboard/mcp-tokens');
  process.exit(1);
}

async function getPerspectives() {
  try {
    const response = await fetch('https://www.polydev.ai/api/perspectives', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        prompt,
        mode: 'managed',
        project_memory: 'none'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    console.log('\n=== Polydev Multi-Model Perspectives ===\n');
    console.log(`Question: ${prompt}\n`);
    console.log(`Received ${data.responses?.length || 0} perspectives\n`);
    
    if (data.responses) {
      data.responses.forEach((response, index) => {
        console.log(`\n--- ${response.model.toUpperCase()} ---`);
        if (response.error) {
          console.log(`❌ Error: ${response.error}`);
        } else {
          console.log(response.content);
          if (response.tokens_used) {
            console.log(`\nTokens: ${response.tokens_used}, Latency: ${response.latency_ms}ms`);
          }
        }
      });
    }
    
    if (data.total_tokens) {
      console.log(`\n\nTotal tokens: ${data.total_tokens}`);
    }
    
  } catch (error) {
    console.error('Error getting perspectives:', error.message);
    process.exit(1);
  }
}

getPerspectives();





