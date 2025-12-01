import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function researchSandboxArchitectures() {
  console.log('🔍 Researching Production Sandbox Architectures\n');
  console.log('='.repeat(80) + '\n');
  
  await Promise.all([polydev.initialize(), exa.initialize()]);

  // 1. Daytona Architecture
  console.log('📚 RESEARCHING DAYTONA ARCHITECTURE\n');
  const daytonaRepo = await exa.search('site:github.com/daytonaio/daytona architecture sandbox implementation', {
    numResults: 5,
    type: 'deep',
    livecrawl: 'preferred'
  });
  
  console.log('Daytona Research Results:\n');
  if (daytonaRepo.content?.[0]) {
    console.log(daytonaRepo.content[0].text.substring(0, 3000));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 2. OnKernel Architecture  
  console.log('📚 RESEARCHING ONKERNEL ARCHITECTURE\n');
  const onkernelArch = await exa.search('OnKernel.com sandbox architecture browser VM implementation', {
    numResults: 5,
    type: 'deep',
    livecrawl: 'preferred'
  });
  
  console.log('OnKernel Research Results:\n');
  if (onkernelArch.content?.[0]) {
    console.log(onkernelArch.content[0].text.substring(0, 3000));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 3. Get Expert Analysis on Architecture Mistakes
  console.log('🤖 GETTING EXPERT ANALYSIS ON ARCHITECTURE MISTAKES\n');
  const expertAnalysis = await polydev.getPerspectives(`
    I've been trying to build a browser-in-browser sandbox using Firecracker VMs for 3-4 weeks.
    
    CURRENT BROKEN ARCHITECTURE:
    - Frontend (Next.js on port 3000) → Master Controller (Express on port 4000) → Firecracker VM
    - Frontend gets 404 errors on /api/webrtc/session/[sessionId]/answer
    - WebRTC signaling routes exist but return 404
    - Master controller keeps crashing or not responding
    - VMs boot but services inside don't start properly
    
    WHAT I KEEP DOING WRONG:
    - Making the same fundamental mistakes repeatedly
    - Not learning from production systems like Daytona, OnKernel
    - Focusing on symptoms instead of root architectural problems
    - Not understanding the correct flow for sandbox initialization
    
    QUESTION: What are the FUNDAMENTAL ARCHITECTURAL MISTAKES I'm making?
    
    Based on how Daytona and OnKernel actually work:
    1. What is the correct initialization flow for a sandbox?
    2. How should WebRTC signaling actually work between frontend and VM?
    3. What am I fundamentally misunderstanding about VM orchestration?
    4. What are the 3 biggest architectural mistakes I need to fix FIRST before anything else?
  `);
  
  console.log(expertAnalysis);
  console.log('\n' + '='.repeat(80) + '\n');

  // 4. Research Browser VM Sandbox Best Practices
  console.log('📚 RESEARCHING BROWSER VM SANDBOX BEST PRACTICES\n');
  const bestPractices = await exa.search('browser sandbox VM orchestration WebRTC architecture best practices', {
    numResults: 5,
    type: 'deep'
  });
  
  console.log('Best Practices Research:\n');
  if (bestPractices.content?.[0]) {
    console.log(bestPractices.content[0].text.substring(0, 3000));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 5. Get Specific Fix Recommendations
  console.log('🤖 GETTING SPECIFIC FIX RECOMMENDATIONS\n');
  const fixRecommendations = await polydev.getPerspectives(`
    Frontend error: GET http://localhost:3000/api/webrtc/session/7ecdbe7e-.../answer returns 404
    
    Route file exists at: src/app/api/webrtc/session/[sessionId]/answer/route.ts
    Route has GET and POST handlers
    Master controller on port 4000 is not responding (connection refused)
    
    This is the 3rd-4th week with the same issues.
    
    What is the ROOT CAUSE and the CORRECT FIX?
    
    Don't give me band-aids - tell me what fundamental architecture I need to change.
  `);
  
  console.log(fixRecommendations);
  console.log('\n' + '='.repeat(80) + '\n');

  // 6. Research Daytona's specific implementation
  console.log('📚 DEEP DIVE: DAYTONA IMPLEMENTATION\n');
  const daytonaDeepDive = await exa.getCodeContext('Daytona sandbox VM initialization WebRTC', 10000);
  
  console.log('Daytona Code Context:\n');
  if (daytonaDeepDive.content?.[0]) {
    console.log(daytonaDeepDive.content[0].text.substring(0, 5000));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  console.log('✅ Research complete. Review the findings above to understand correct architecture.\n');
}

researchSandboxArchitectures().catch(console.error);
