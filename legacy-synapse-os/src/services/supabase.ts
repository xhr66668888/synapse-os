import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Supabase 配置 - 请在 .env 中配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 通用 CRUD 操作封装
export const db = {
  // 查询
  async select<T>(table: string, query?: { column?: string; value?: unknown }) {
    let q = supabase.from(table).select('*');
    if (query?.column && query?.value) {
      q = q.eq(query.column, query.value);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data as T[];
  },

  // 插入
  async insert<T>(table: string, data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result as T;
  },

  // 更新
  async update<T>(table: string, id: string, data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result as T;
  },

  // 删除
  async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  // 实时订阅
  subscribe(
    table: string,
    callback: (payload: unknown) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ) {
    return supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        callback
      )
      .subscribe();
  },
};

export default supabase;
