import { ClientType } from '../types';

// Grille de commission fixe par type de client, pour les laveurs.
export const CLIENT_TYPE_GRID: Record<ClientType, { label: string; price: number; commission: number }> = {
  vip: { label: 'VIP', price: 900, commission: 200 },
  simple: { label: 'Simple', price: 500, commission: 70 },
  enfant: { label: 'Enfant', price: 300, commission: 50 },
};
