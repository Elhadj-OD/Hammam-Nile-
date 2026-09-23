import { ClientType } from '../types';

// Grille de commission fixe par type de client, pour les laveurs.
export const CLIENT_TYPE_GRID: Record<ClientType, { label: string; price: number; commission: number }> = {
  vip: { label: 'VIP', price: 9000, commission: 2000 },
  simple: { label: 'Simple', price: 5000, commission: 700 },
  enfant: { label: 'Enfant', price: 3000, commission: 500 },
};
