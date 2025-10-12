/**
 * Supabase Database Client
 * Provides database access with proper authentication
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('../utils/logger').module('database');

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(
  config.database.supabaseUrl,
  config.database.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;

    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
}

// Database helper functions
const db = {
  supabase,

  /**
   * Users
   */
  users: {
    async create(email, supabaseAuthId) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          supabase_auth_id: supabaseAuthId,
          status: 'created'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async findByEmail(email) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    },

    async findById(userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },

    async update(userId, updates) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async assignDecodoPort(userId, port, fixedIP) {
      return await this.update(userId, {
        decodo_proxy_port: port,
        decodo_fixed_ip: fixedIP
      });
    },

    async assignVM(userId, vmId, vmIP) {
      return await this.update(userId, {
        vm_id: vmId,
        vm_ip: vmIP
      });
    },

    async updateLastActive(userId) {
      await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', userId);
    },

    async list(filters = {}) {
      let query = supabase.from('users').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        query = query.ilike('email', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  },

  /**
   * VMs
   */
  vms: {
    async create(vmData) {
      const { data, error } = await supabase
        .from('vms')
        .insert(vmData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async findById(vmId) {
      const { data, error } = await supabase
        .from('vms')
        .select('*')
        .eq('vm_id', vmId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async findByUserId(userId) {
      // DEBUG: Log query parameters
      logger.info('[FINDBYUSERID] Query starting', { userId });

      // DEBUG: First check all VMs for this user
      const { data: allVMs } = await supabase
        .from('vms')
        .select('vm_id, vm_type, destroyed_at, created_at, status')
        .eq('user_id', userId);

      logger.info('[FINDBYUSERID] All VMs for user', {
        userId,
        count: allVMs?.length || 0,
        vms: allVMs
      });

      // Modified query: use ORDER BY + LIMIT instead of .single() to handle multiple CLI VMs
      const { data, error } = await supabase
        .from('vms')
        .select('*')
        .eq('user_id', userId)
        .eq('vm_type', 'cli')
        .is('destroyed_at', null)  // Only return active VMs (not destroyed)
        .order('created_at', { ascending: false })  // Get most recent first
        .limit(1);  // Limit to 1 result

      logger.info('[FINDBYUSERID] Query result', {
        userId,
        found: !!data?.[0],
        vmId: data?.[0]?.vm_id,
        vmType: data?.[0]?.vm_type,
        destroyedAt: data?.[0]?.destroyed_at,
        errorCode: error?.code,
        errorMessage: error?.message
      });

      if (error) throw error;
      return data?.[0] || null;  // Return first element or null
    },

    async update(vmId, updates) {
      const { data, error } = await supabase
        .from('vms')
        .update(updates)
        .eq('vm_id', vmId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(vmId, status, additionalData = {}) {
      return await this.update(vmId, { status, ...additionalData });
    },

    async updateHeartbeat(vmId, cpuUsage, memoryUsage) {
      await supabase
        .from('vms')
        .update({
          last_heartbeat: new Date().toISOString(),
          cpu_usage_percent: cpuUsage,
          memory_usage_mb: memoryUsage
        })
        .eq('vm_id', vmId);
    },

    async list(filters = {}) {
      let query = supabase.from('vms').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.type) {
        query = query.eq('vm_type', filters.type);
      }

      if (filters.excludeDestroyed) {
        query = query.is('destroyed_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async getStatistics() {
      const { data, error } = await supabase.rpc('get_vm_statistics');
      if (error) throw error;
      return data[0] || {};
    }
  },

  /**
   * Provider Credentials
   */
  credentials: {
    async create(userId, provider, encryptedData) {
      // Use upsert to handle duplicate credentials (update if exists, insert if not)
      const { data, error } = await supabase
        .from('provider_credentials')
        .upsert({
          user_id: userId,
          provider,
          encrypted_credentials: encryptedData.encrypted,
          encryption_iv: encryptedData.iv,
          encryption_tag: encryptedData.authTag,
          encryption_salt: encryptedData.salt,
          is_valid: true
        }, {
          onConflict: 'user_id,provider'  // Specify the unique constraint columns
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async find(userId, provider) {
      const { data, error } = await supabase
        .from('provider_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async update(credentialId, updates) {
      const { data, error } = await supabase
        .from('provider_credentials')
        .update(updates)
        .eq('credential_id', credentialId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateValidation(credentialId, isValid) {
      await supabase
        .from('provider_credentials')
        .update({
          is_valid: isValid,
          last_verified: new Date().toISOString()
        })
        .eq('credential_id', credentialId);
    },

    async listByUser(userId) {
      const { data, error } = await supabase
        .from('provider_credentials')
        .select('credential_id, provider, is_valid, last_verified, expires_at')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    }
  },

  /**
   * Prompts
   */
  prompts: {
    async create(userId, vmId, provider, promptText) {
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: userId,
          vm_id: vmId,
          provider,
          prompt_text: promptText,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(promptId, updates) {
      const { data, error } = await supabase
        .from('prompts')
        .update(updates)
        .eq('prompt_id', promptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async complete(promptId, responseText, exitCode, durationMs) {
      return await this.update(promptId, {
        status: 'completed',
        response_text: responseText,
        exit_code: exitCode,
        duration_ms: durationMs,
        completed_at: new Date().toISOString()
      });
    },

    async fail(promptId, errorMessage) {
      return await this.update(promptId, {
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      });
    },

    async getStatsByUser(userId) {
      const { data, error } = await supabase.rpc('get_user_prompt_stats', {
        p_user_id: userId
      });

      if (error) throw error;
      return data[0] || {};
    }
  },

  /**
   * Auth Sessions
   */
  authSessions: {
    async create(userId, provider) {
      const { data, error } = await supabase
        .from('auth_sessions')
        .insert({
          user_id: userId,
          provider,
          status: 'started',
          timeout_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min timeout
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async findById(sessionId) {
      const { data, error } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async update(sessionId, updates) {
      const { data, error } = await supabase
        .from('auth_sessions')
        .update(updates)
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(sessionId, status, additionalData = {}) {
      return await this.update(sessionId, { status, ...additionalData });
    }
  },

  /**
   * System Metrics
   */
  metrics: {
    async record(metricsData) {
      const { error } = await supabase
        .from('system_metrics')
        .insert(metricsData);

      if (error) throw error;
    },

    async getLatest() {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async getRange(startDate, endDate) {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data;
    }
  }
};

module.exports = {
  supabase,
  db,
  testConnection
};
