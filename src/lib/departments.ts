import { CaisseDepartment, ProductCategory } from '../types';

// Chaque caissière avec un département assigné est verrouillée sur sa propre caisse
export const DEPARTMENTS: Record<
  CaisseDepartment,
  { label: string; icon: string; category: ProductCategory }
> = {
  boutique_femme: { label: 'Boutique Femme', icon: '💄', category: 'femmes' },
  boutique_homme: { label: 'Boutique Homme', icon: '🧔', category: 'hommes' },
  hammam_bains: { label: 'Hammam & Bains', icon: '♨️', category: 'hammam_bains' },
  spa_massage: { label: 'Spa & Massage', icon: '💆', category: 'spa_massage' },
  coiffure_salon: { label: 'Coiffure & Salon', icon: '💇', category: 'coiffure_salon' },
};
