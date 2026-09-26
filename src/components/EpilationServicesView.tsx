import React from 'react';
import { ServiceCaisseView } from './ServiceCaisseView';

export const EpilationServicesView: React.FC = () => (
  <ServiceCaisseView
    category="epilation_traditionnelle"
    eyebrow="Épilation Traditionnelle"
    pageTitle="Helwa & Henné — Services"
    pageSubtitle="Sélectionnez une prestation ci-dessous, puis encaissez directement — pas de panier boutique, pas de commission."
    tabs={[
      { key: 'helwa', label: '🪡 Helwa', filter: p => p.name.startsWith('Helwa') },
      { key: 'henne', label: '🎨 Henné', filter: p => p.name.startsWith('Henné') },
    ]}
  />
);
