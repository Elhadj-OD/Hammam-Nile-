import React from 'react';
import { ServiceCaisseView } from './ServiceCaisseView';

export const CoiffureServicesView: React.FC = () => (
  <ServiceCaisseView
    category="coiffure_salon"
    eyebrow="Coiffure & Salon"
    pageTitle="Coiffure & Salon — Services"
    pageSubtitle="Sélectionnez une prestation ci-dessous, puis encaissez directement — pas de panier boutique, pas de commission."
  />
);
