import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, Client, StockMovement, HammamUsage, Quote, Invoice, ShopSettings, PresenceRow } from '../types';

// Read credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================================
// 1. PRODUITS & STOCKS
// ============================================================================
export async function getProductsFromSupabase(): Promise<Product[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase fetch products error:', error.message);
      return null;
    }
    return data as Product[];
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function saveProductToSupabase(product: Product): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'id' });
    if (error) console.warn('Supabase save product error:', error.message);
  } catch (err) {
    console.warn('Supabase save product error:', err);
  }
}

export async function deleteProductFromSupabase(id: number): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) console.warn('Supabase delete product error:', error.message);
  } catch (err) {
    console.warn('Supabase delete product error:', err);
  }
}

// ============================================================================
// 2. VENTES (SALES)
// ============================================================================
export async function getSalesFromSupabase(): Promise<Sale[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetch sales error:', error.message);
      return null;
    }
    return data as Sale[];
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function saveSaleToSupabase(sale: Sale): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('sales')
      .upsert(sale, { onConflict: 'id' });
    if (error) console.warn('Supabase save sale error:', error.message);
  } catch (err) {
    console.warn('Supabase save sale error:', err);
  }
}

// ============================================================================
// 3. CLIENTS
// ============================================================================
export async function getClientsFromSupabase(): Promise<Client[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase fetch clients error:', error.message);
      return null;
    }
    return data as Client[];
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function saveClientToSupabase(client: Client): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('clients')
      .upsert(client, { onConflict: 'id' });
    if (error) console.warn('Supabase save client error:', error.message);
  } catch (err) {
    console.warn('Supabase save client error:', err);
  }
}

export async function deleteClientFromSupabase(id: number): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) console.warn('Supabase delete client error:', error.message);
  } catch (err) {
    console.warn('Supabase delete client error:', err);
  }
}

// ============================================================================
// 4. MOUVEMENTS DE STOCK
// ============================================================================
export async function getMovementsFromSupabase(): Promise<StockMovement[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetch movements error:', error.message);
      return null;
    }
    return data as StockMovement[];
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function saveMovementToSupabase(movement: StockMovement): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('stock_movements')
      .insert(movement);
    if (error) console.warn('Supabase save movement error:', error.message);
  } catch (err) {
    console.warn('Supabase save movement error:', err);
  }
}

// ============================================================================
// 5. PRÉLÈVEMENTS HAMMAM (USAGE INTERNE)
// ============================================================================
export async function getHammamUsagesFromSupabase(): Promise<HammamUsage[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('hammam_usages')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetch hammam usages error:', error.message);
      return null;
    }
    return data as HammamUsage[];
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function saveHammamUsageToSupabase(usage: HammamUsage): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('hammam_usages')
      .insert(usage);
    if (error) console.warn('Supabase save hammam usage error:', error.message);
  } catch (err) {
    console.warn('Supabase save hammam usage error:', err);
  }
}

// ============================================================================
// 6. PARAMÈTRES BOUTIQUE
// ============================================================================
export async function getShopSettingsFromSupabase(): Promise<ShopSettings | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return null;
    return data.settings as ShopSettings;
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function saveShopSettingsToSupabase(settings: ShopSettings): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('shop_settings')
      .upsert({ id: 1, settings, updated_at: new Date().toISOString() });
    if (error) console.warn('Supabase save settings error:', error.message);
  } catch (err) {
    console.warn('Supabase save settings error:', err);
  }
}

// ============================================================================
// 7. PRÉSENCE (qui est connecté, sur quel poste) — pour le contrôle des heures
// ============================================================================
export async function getPresenceFromSupabase(): Promise<PresenceRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('presence')
      .select('*');

    if (error) {
      console.warn('Supabase fetch presence error:', error.message);
      return null;
    }
    return data as PresenceRow[];
  } catch (err) {
    console.warn('Supabase error:', err);
    return null;
  }
}

export async function upsertPresenceToSupabase(row: PresenceRow): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('presence')
      .upsert(row, { onConflict: 'username' });
    if (error) console.warn('Supabase save presence error:', error.message);
  } catch (err) {
    console.warn('Supabase save presence error:', err);
  }
}

export async function clearPresenceFromSupabase(username: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('presence')
      .delete()
      .eq('username', username);
    if (error) console.warn('Supabase clear presence error:', error.message);
  } catch (err) {
    console.warn('Supabase clear presence error:', err);
  }
}
