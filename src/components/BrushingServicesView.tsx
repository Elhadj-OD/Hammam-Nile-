import React from 'react';
import { ServiceCaisseView } from './ServiceCaisseView';

export const BrushingServicesView: React.FC = () => (
  <ServiceCaisseView
    category="brushing"
    eyebrow="Brushing"
    pageTitle="Brushing — Services"
    pageSubtitle="Sélectionnez une prestation ci-dessous, puis encaissez directement — pas de panier boutique, pas de commission."
  />
);
