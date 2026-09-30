import React from 'react';
import { ServiceCaisseView } from './ServiceCaisseView';

export const EstheticServicesView: React.FC = () => (
  <ServiceCaisseView
    category="spa_massage"
    eyebrow="Esthétique"
    pageTitle="Esthétique — Services"
    pageSubtitle="Sélectionnez une prestation ci-dessous, puis encaissez directement — pas de panier boutique, pas de commission."
  />
);
