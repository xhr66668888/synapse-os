/**
 * Supabase Client
 * 
 * 连接 Supabase 数据库
 */

import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mntsjdsavmycivyziina.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GRPG1MT6rHMadG5QYeQ6gw_GMM9OmOD';

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// 导出类型
export type { SupabaseClient } from '@supabase/supabase-js';
