/**
 * Supabase Database Client using MCP Server
 * Leverages Supabase MCP for efficient database operations
 *
 * Note: This is designed to work within the Polydev backend
 * For the Master Controller running separately, we'll use direct Supabase client
 * This file demonstrates how to structure queries for MCP usage
 */

const logger = require('../utils/logger').module('mcp-database');

/**
 * MCP Supabase Wrapper
 * These functions show the SQL patterns that can be executed via MCP
 */
class MCPSupabaseClient {
  /**
   * Execute SQL query
   * In production, this would call the MCP server
   * For Master Controller, we'll use direct Supabase client instead
   */
  async executeSQL(query) {
    // This is a template - actual implementation in master-controller
    // will use @supabase/supabase-js client
    logger.debug('SQL Query', { query: query.substring(0, 100) });
    throw new Error('MCP execution should be called from frontend, not Master Controller');
  }

  /**
   * SQL Query Templates
   * These can be used by both MCP and direct client
   */
  queries = {
    // Users
    createUser: (email, supabaseAuthId) => `
      INSERT INTO users (email, supabase_auth_id, status)
      VALUES ('${email}', '${supabaseAuthId}', 'created')
      RETURNING *;
    `,

    findUserByEmail: (email) => `
      SELECT * FROM users WHERE email = '${email}' LIMIT 1;
    `,

    findUserById: (userId) => `
      SELECT * FROM users WHERE user_id = '${userId}' LIMIT 1;
    `,

    updateUser: (userId, fields) => {
      const updates = Object.entries(fields)
        .map(([key, value]) => {
          if (value === null) return `${key} = NULL`;
          if (typeof value === 'string') return `${key} = '${value}'`;
          if (typeof value === 'number') return `${key} = ${value}`;
          if (typeof value === 'boolean') return `${key} = ${value}`;
          return `${key} = '${JSON.stringify(value)}'`;
        })
        .join(', ');

      return `
        UPDATE users
        SET ${updates}, updated_at = NOW()
        WHERE user_id = '${userId}'
        RETURNING *;
      `;
    },

    assignDecodoPort: (userId, port, fixedIP) => `
      UPDATE users
      SET decodo_proxy_port = ${port},
          decodo_fixed_ip = '${fixedIP}'
      WHERE user_id = '${userId}'
      RETURNING *;
    `,

    assignVM: (userId, vmId, vmIP) => `
      UPDATE users
      SET vm_id = '${vmId}',
          vm_ip = '${vmIP}'
      WHERE user_id = '${userId}'
      RETURNING *;
    `,

    updateLastActive: (userId) => `
      UPDATE users
      SET last_active_at = NOW()
      WHERE user_id = '${userId}';
    `,

    listUsers: (filters = {}) => {
      let where = ['1=1'];

      if (filters.status) {
        where.push(`status = '${filters.status}'`);
      }

      if (filters.search) {
        where.push(`email ILIKE '%${filters.search}%'`);
      }

      return `
        SELECT * FROM users
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC;
      `;
    },

    // VMs
    createVM: (vmData) => {
      const fields = Object.keys(vmData).join(', ');
      const values = Object.values(vmData).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v}'`;
        if (typeof v === 'number') return v;
        if (typeof v === 'boolean') return v;
        return `'${JSON.stringify(v)}'`;
      }).join(', ');

      return `
        INSERT INTO vms (${fields})
        VALUES (${values})
        RETURNING *;
      `;
    },

    findVMById: (vmId) => `
      SELECT * FROM vms WHERE vm_id = '${vmId}' LIMIT 1;
    `,

    findVMByUserId: (userId) => `
      SELECT * FROM vms
      WHERE user_id = '${userId}'
        AND vm_type = 'cli'
      LIMIT 1;
    `,

    updateVM: (vmId, fields) => {
      const updates = Object.entries(fields)
        .map(([key, value]) => {
          if (value === null) return `${key} = NULL`;
          if (typeof value === 'string') return `${key} = '${value}'`;
          if (typeof value === 'number') return `${key} = ${value}`;
          if (typeof value === 'boolean') return `${key} = ${value}`;
          return `${key} = '${JSON.stringify(value)}'`;
        })
        .join(', ');

      return `
        UPDATE vms
        SET ${updates}
        WHERE vm_id = '${vmId}'
        RETURNING *;
      `;
    },

    updateVMStatus: (vmId, status, additionalFields = {}) => {
      const updates = { status, ...additionalFields };
      return this.queries.updateVM(vmId, updates);
    },

    updateVMHeartbeat: (vmId, cpuUsage, memoryUsage) => `
      UPDATE vms
      SET last_heartbeat = NOW(),
          cpu_usage_percent = ${cpuUsage},
          memory_usage_mb = ${memoryUsage}
      WHERE vm_id = '${vmId}';
    `,

    listVMs: (filters = {}) => {
      let where = ['1=1'];

      if (filters.status) {
        where.push(`status = '${filters.status}'`);
      }

      if (filters.type) {
        where.push(`vm_type = '${filters.type}'`);
      }

      if (filters.excludeDestroyed) {
        where.push('destroyed_at IS NULL');
      }

      return `
        SELECT * FROM vms
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC;
      `;
    },

    getVMStatistics: () => `
      SELECT * FROM get_vm_statistics();
    `,

    // Credentials
    createCredential: (userId, provider, encryptedData) => `
      INSERT INTO provider_credentials (
        user_id, provider,
        encrypted_credentials, encryption_iv, encryption_tag, encryption_salt,
        is_valid
      ) VALUES (
        '${userId}', '${provider}',
        '${encryptedData.encrypted}', '${encryptedData.iv}',
        '${encryptedData.authTag}', '${encryptedData.salt}',
        true
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        encrypted_credentials = EXCLUDED.encrypted_credentials,
        encryption_iv = EXCLUDED.encryption_iv,
        encryption_tag = EXCLUDED.encryption_tag,
        encryption_salt = EXCLUDED.encryption_salt,
        is_valid = true,
        updated_at = NOW()
      RETURNING *;
    `,

    findCredential: (userId, provider) => `
      SELECT * FROM provider_credentials
      WHERE user_id = '${userId}' AND provider = '${provider}'
      LIMIT 1;
    `,

    updateCredentialValidation: (credentialId, isValid) => `
      UPDATE provider_credentials
      SET is_valid = ${isValid},
          last_verified = NOW()
      WHERE credential_id = '${credentialId}';
    `,

    listCredentialsByUser: (userId) => `
      SELECT credential_id, provider, is_valid, last_verified, expires_at
      FROM provider_credentials
      WHERE user_id = '${userId}';
    `,

    // Prompts
    createPrompt: (userId, vmId, provider, promptText) => {
      const escapedPrompt = promptText.replace(/'/g, "''");
      return `
        INSERT INTO prompts (user_id, vm_id, provider, prompt_text, status)
        VALUES (
          '${userId}',
          ${vmId ? `'${vmId}'` : 'NULL'},
          '${provider}',
          '${escapedPrompt}',
          'pending'
        )
        RETURNING *;
      `;
    },

    updatePrompt: (promptId, fields) => {
      const updates = Object.entries(fields)
        .map(([key, value]) => {
          if (value === null) return `${key} = NULL`;
          if (typeof value === 'string') {
            const escaped = value.replace(/'/g, "''");
            return `${key} = '${escaped}'`;
          }
          if (typeof value === 'number') return `${key} = ${value}`;
          if (typeof value === 'boolean') return `${key} = ${value}`;
          return `${key} = '${JSON.stringify(value)}'`;
        })
        .join(', ');

      return `
        UPDATE prompts
        SET ${updates}
        WHERE prompt_id = '${promptId}'
        RETURNING *;
      `;
    },

    completePrompt: (promptId, responseText, exitCode, durationMs) => {
      const escaped = responseText ? responseText.replace(/'/g, "''") : '';
      return `
        UPDATE prompts
        SET status = 'completed',
            response_text = '${escaped}',
            exit_code = ${exitCode},
            duration_ms = ${durationMs},
            completed_at = NOW()
        WHERE prompt_id = '${promptId}'
        RETURNING *;
      `;
    },

    failPrompt: (promptId, errorMessage) => {
      const escaped = errorMessage.replace(/'/g, "''");
      return `
        UPDATE prompts
        SET status = 'failed',
            error_message = '${escaped}',
            completed_at = NOW()
        WHERE prompt_id = '${promptId}'
        RETURNING *;
      `;
    },

    getUserPromptStats: (userId) => `
      SELECT * FROM get_user_prompt_stats('${userId}');
    `,

    // Auth Sessions
    createAuthSession: (userId, provider) => `
      INSERT INTO auth_sessions (user_id, provider, status, timeout_at)
      VALUES (
        '${userId}',
        '${provider}',
        'started',
        NOW() + INTERVAL '5 minutes'
      )
      RETURNING *;
    `,

    findAuthSession: (sessionId) => `
      SELECT * FROM auth_sessions
      WHERE session_id = '${sessionId}'
      LIMIT 1;
    `,

    updateAuthSession: (sessionId, fields) => {
      const updates = Object.entries(fields)
        .map(([key, value]) => {
          if (value === null) return `${key} = NULL`;
          if (typeof value === 'string') return `${key} = '${value}'`;
          if (typeof value === 'number') return `${key} = ${value}`;
          if (typeof value === 'boolean') return `${key} = ${value}`;
          return `${key} = '${JSON.stringify(value)}'`;
        })
        .join(', ');

      return `
        UPDATE auth_sessions
        SET ${updates}
        WHERE session_id = '${sessionId}'
        RETURNING *;
      `;
    },

    // System Metrics
    recordMetrics: (metricsData) => {
      const fields = Object.keys(metricsData);
      const values = Object.values(metricsData).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v}'`;
        if (typeof v === 'number') return v;
        if (typeof v === 'boolean') return v;
        if (Array.isArray(v)) return `ARRAY[${v.join(',')}]`;
        return `'${JSON.stringify(v)}'`;
      });

      return `
        INSERT INTO system_metrics (${fields.join(', ')})
        VALUES (${values.join(', ')});
      `;
    },

    getLatestMetrics: () => `
      SELECT * FROM system_metrics
      ORDER BY recorded_at DESC
      LIMIT 1;
    `,

    getMetricsRange: (startDate, endDate) => `
      SELECT * FROM system_metrics
      WHERE recorded_at >= '${startDate.toISOString()}'
        AND recorded_at <= '${endDate.toISOString()}'
      ORDER BY recorded_at ASC;
    `
  };
}

/**
 * Export SQL query templates for use in Master Controller
 * These can be executed via direct Supabase client
 */
module.exports = {
  MCPSupabaseClient,
  sqlQueries: new MCPSupabaseClient().queries
};
