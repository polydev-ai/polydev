# Privacy and Security Trust Model - The Honest Truth

## TL;DR: Can the Server See My Data?

**YES.** The Polydev server can technically see your conversations in plaintext. Privacy Mode is about **what happens with AI providers**, not about hiding data from Polydev.

This document explains exactly what Privacy Mode protects, what it doesn't, and how to make informed decisions about your data.

---

## Your Critical Question

> "Can the server disable Privacy Mode and see my data anyway?"

**The Honest Answer:**

1. **YES**, the server CAN see your conversation data in plaintext (Privacy Mode or not)
2. **NO**, the server cannot "disable" your Privacy Mode setting without you knowing (it's in the database, you can verify)
3. **BUT** Privacy Mode isn't about hiding data from Polydev - it's about controlling what happens with AI providers

---

## What Privacy Mode Actually Does

### ✅ What Privacy Mode PROVIDES:

1. **Transparency About AI Provider Retention**
   - Shows you exactly how long AI providers keep your data:
     - OpenAI: 30 days
     - Anthropic: 7 days
   - Informs you about BYOK option for maximum control

2. **Conversation Storage**
   - All conversations stored encrypted at rest (AES-256-GCM)
   - You can always access your conversation history
   - Database encryption protects against database breaches

3. **Future Enterprise Agreements**
   - We're working on establishing zero-data-retention agreements with AI providers
   - When these are in place, Privacy Mode will leverage them
   - You'll be notified when true zero-data-retention is available

### ❌ What Privacy Mode DOES NOT PROVIDE:

1. **Zero-Knowledge Encryption**
   - Server MUST see plaintext to route requests to AI providers
   - Server needs plaintext for billing, rate limiting, and model selection
   - If you need zero-knowledge, use a fully local solution like Cline

2. **Protection from Polydev Server**
   - Privacy Mode is a user preference stored in database
   - Server operators could theoretically read conversations
   - **Trust in Polydev is required** (see Trust Model below)

3. **Immediate Zero-Data-Retention**
   - Currently working on Enterprise agreements
   - AI providers retain data per their policies (OpenAI: 30d, Anthropic: 7d)
   - Self-service API headers for zero-retention don't exist

---

## The Trust Model: What You're Trusting

When you use Polydev with Polydev-managed API keys, you are trusting:

### 1. Polydev Server Operators
**What They Could Theoretically Do:**
- Read any conversation in plaintext (data passes through server)
- Modify your privacy mode setting
- Access encrypted-at-rest data (they control the encryption keys)
- See which AI models you're using

**What Prevents Abuse:**
- Legal/contractual obligations
- Reputation and business incentives
- Audit logs and monitoring
- At-rest encryption (protects against database breaches, not admin access)

### 2. AI Provider Data Retention
**With Polydev API Keys:**
- OpenAI: 30-day retention
- Anthropic: 7-day retention
- Data may be used per provider's default policies

**With Your Own API Keys (BYOK):**
- YOU control the relationship with AI providers
- YOU can establish your own zero-data-retention agreements
- Maximum privacy control

### 3. Infrastructure Providers
- Database: Supabase (encrypted at rest)
- Hosting: Vercel
- Network: HTTPS/TLS for all communications

---

## Comparison: Different Trust Models

| Solution | Who Can See Plaintext | What You Trust | Privacy Level |
|----------|----------------------|----------------|---------------|
| **Polydev (Managed Keys)** | Polydev server | Polydev operators + AI providers | Moderate |
| **Polydev (BYOK)** | Polydev server | Polydev operators + Your AI agreements | Higher |
| **Cline (Local)** | Only your machine | Your machine's security | Highest |
| **ChatGPT/Claude Direct** | AI provider | AI provider only | Moderate |
| **Email (Gmail/Outlook)** | Email provider | Email provider | Moderate (similar model) |

---

## Privacy Mode vs. Standard Mode

| Feature | Standard Mode | Privacy Mode |
|---------|--------------|--------------|
| **Server sees plaintext** | ✅ Yes | ✅ Yes |
| **Conversations stored** | ✅ Yes (encrypted at rest) | ✅ Yes (encrypted at rest) |
| **Conversation history** | ✅ Available | ✅ Available |
| **Transparency about retention** | ❌ No | ✅ Yes |
| **AI provider retention info** | Not shown | OpenAI: 30d, Anthropic: 7d |
| **BYOK guidance** | Not shown | ✅ Highlighted |
| **Future zero-retention** | ❌ No | ✅ Yes (when Enterprise agreements secured) |

---

## Can the Server "Disable" Privacy Mode?

### Technical Reality:

1. **Your Privacy Mode setting** is stored in the database:
   ```sql
   SELECT privacy_mode, privacy_mode_enabled_at
   FROM profiles
   WHERE id = 'your-user-id';
   ```

2. **You can verify** your Privacy Mode status anytime in Settings → Security

3. **Server operators** with database access could technically change it, BUT:
   - This would violate terms of service
   - Audit logs would show the change
   - Reputation and legal consequences
   - You would see it changed in your UI

### Practical Reality:

**Privacy Mode is a trust-based feature**, similar to how:
- Gmail operators could read your emails (but don't because of legal/ethical obligations)
- Your bank could access your account (but doesn't due to regulations and trust)
- Your email provider could disable encryption (but doesn't because of reputation)

---

## What Actually Protects Your Data

### 1. At-Rest Encryption (AES-256-GCM)
**Protects Against:**
- Database breaches
- Unauthorized database dumps
- Stolen backup files

**Does NOT Protect Against:**
- Server operators with encryption keys
- Active server compromise
- Man-in-the-middle attacks (handled by HTTPS)

### 2. HTTPS/TLS
**Protects Against:**
- Network eavesdropping
- Man-in-the-middle attacks
- ISP snooping

**Does NOT Protect Against:**
- Server-side access
- Endpoint compromise

### 3. Legal and Contractual Obligations
**Protects Against:**
- Intentional misuse by operators
- Unauthorized data sharing
- Privacy violations

**Does NOT Protect Against:**
- Government requests (unless we fight them)
- Hacking/security breaches

### 4. Future: Enterprise Zero-Data-Retention Agreements
**Will Protect Against:**
- AI providers using data for training
- Long-term data retention by AI providers
- Data being sold or shared

**Does NOT Protect Against:**
- Polydev server access
- Infrastructure provider access

---

## When to Use Privacy Mode

### ✅ Use Privacy Mode If You Want:
- Transparency about where your data goes
- Clear information about AI provider retention
- To prepare for future zero-data-retention agreements
- Guidance on BYOK options
- To understand exactly what privacy you're getting

### ❌ Don't Use Privacy Mode If You Think:
- It hides data from Polydev server (it doesn't)
- It's "end-to-end encryption" (it's not)
- It gives you "zero-knowledge" (it doesn't)
- The server can't see your conversations (it can)

---

## Maximum Privacy Options

### Option 1: BYOK (Bring Your Own Keys) - HIGH PRIVACY
**What This Gives You:**
- Control over AI provider relationships
- Ability to establish your own zero-data-retention agreements
- Transparency about data flow
- Still requires trust in Polydev server

**What This Doesn't Give You:**
- Zero-knowledge encryption
- Protection from Polydev server

**How to Set Up:** Settings → Security → Bring Your Own API Keys

### Option 2: Local-Only Solutions - MAXIMUM PRIVACY
**Best Options:**
- **Cline**: VS Code extension, all processing local, BYOK only
- **Continue**: Similar to Cline, local processing
- **Local LLMs**: Ollama, LM Studio, etc.

**Trade-Offs:**
- More complex setup
- Limited to models you can run locally or have keys for
- No managed service convenience
- No comparison across models (unless you manage multiple keys)

---

## Honest Comparison with Competitors

### Cursor
- **Trust Model**: Similar to Polydev (server sees plaintext)
- **Privacy Mode**: "No storage, no training, zero data retention"
- **Encryption**: AES-256 at rest
- **Zero-Data-Retention**: Enterprise agreements with OpenAI, Anthropic
- **Certifications**: SOC 2 Type II

### Cline
- **Trust Model**: Zero server trust (all local)
- **Privacy Mode**: Not needed (nothing goes to Cline servers)
- **Encryption**: VS Code secret storage (OS keychain)
- **Zero-Data-Retention**: You control (BYOK only)
- **Certifications**: N/A (open source)

### Polydev
- **Trust Model**: Server trust required (like email providers)
- **Privacy Mode**: Transparency + future zero-retention
- **Encryption**: AES-256-GCM at rest
- **Zero-Data-Retention**: Working on Enterprise agreements
- **Certifications**: In progress

---

## FAQ: The Hard Questions

### Q: Why should I trust Polydev with my data?

**A:** You're trusting us similarly to how you trust Gmail, Slack, or GitHub:
- We have legal obligations to protect your data
- Our business depends on user trust
- We're incentivized to protect your privacy
- At-rest encryption protects against breaches
- BYOK option reduces what you need to trust us with

**BUT**: If you don't want to trust ANY server, use Cline or local solutions.

### Q: Can you prove you're not reading my conversations?

**A:** No, we cannot prove this cryptographically (similar to email providers). You must trust:
- Our legal obligations
- Our business reputation
- Our security practices
- Audit logs and monitoring

**If you need cryptographic proof**, use end-to-end encrypted solutions or local-only tools.

### Q: What happens if Polydev gets hacked?

**A:** At-rest encryption protects the database dump, but:
- Active server compromise could expose conversations in transit
- Encryption keys could potentially be accessed
- This is why we're working on SOC 2 certification
- This is why BYOK option is valuable

### Q: What happens if you receive a government request?

**A:** We would:
- Comply with valid legal requests (like all US companies)
- Fight overly broad requests when possible
- Notify users when legally permitted
- Be transparent about requests (in annual transparency reports)

**If this concerns you**, use BYOK or local solutions.

### Q: Is Privacy Mode just marketing?

**A:** No, but it's important to understand what it actually does:
- ✅ Provides transparency (this is valuable)
- ✅ Prepares for future zero-retention agreements
- ✅ Helps you make informed decisions
- ❌ Does NOT hide data from Polydev server
- ❌ Does NOT provide zero-knowledge encryption

We're being honest about what Privacy Mode does and doesn't do.

---

## Recommendations by Use Case

### For Open Source Projects (Public Code)
- **Standard Mode** is fine
- Privacy Mode if you want transparency
- Data is public anyway

### For Proprietary Code (Private Company)
- **Privacy Mode** recommended for transparency
- **BYOK** for maximum control
- Consider Cursor/Cline for highest security

### For Highly Sensitive Code (Security/Healthcare/Finance)
- **BYOK** required minimum
- **Local-only solutions** (Cline) recommended
- Establish own zero-data-retention agreements with AI providers
- Consider on-premise LLM solutions

### For Personal Projects
- **Standard Mode** is fine for most
- **Privacy Mode** if you want to understand where data goes
- **BYOK** if you're privacy-conscious

---

## Summary: The Honest Truth

**Privacy Mode** is about **transparency and future zero-data-retention**, not about hiding your data from Polydev.

✅ **What We Honestly Provide:**
- Transparent communication about data retention
- Encrypted at-rest storage
- BYOK option for maximum control
- Working toward Enterprise zero-retention agreements

❌ **What We Honestly Cannot Provide:**
- Zero-knowledge encryption (server must see plaintext)
- Protection from server operators (trust required)
- Immediate zero-data-retention (working on Enterprise agreements)
- Cryptographic proof we're not reading conversations

**The Bottom Line:**
- If you trust Polydev like you trust Gmail/Slack: Use Polydev with Privacy Mode
- If you want maximum control: Use BYOK option
- If you don't want to trust any server: Use Cline or local solutions

---

## Questions?

If you have questions about this trust model, please:
- Email: privacy@polydev.ai
- Documentation: https://docs.polydev.ai/privacy
- Open discussion: https://github.com/polydev-ai/discussions

**We believe in honest, transparent communication about privacy. If something in this document is unclear or misleading, please let us know.**

---

**Last Updated:** January 29, 2025
**Next Review:** March 1, 2025 (or when Enterprise agreements are established)
