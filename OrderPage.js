'use client'

import { useState } from 'react'
import ReceiptPrint from '@/components/ReceiptPrint'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function OrderPage() {
  // Informations sur l'utilisateur actuellement connecté (Admin, Gérant ou Serveur)
  const [currentUser, setCurrentUser] = useState({
    role: 'Serveur', // Ex: 'Admin', 'Gérant', 'Serveur'
    name: 'Moussa',
    pin: '1122'
  })

  // Articles dans le panier courant
  const [cart, setCart] = useState([
    { name: 'Café Expresso', quantity: 2, price: 50 },
    { name: 'Jus d’Orange', quantity: 1, price: 80 }
  ])

  // État de la commande courante à imprimer
  const [currentPrintOrder, setCurrentPrintOrder] = useState(null)

  // Fonction appelée dès qu'une commande est LANCÉE
  const handleLaunchOrder = async () => {
    if (!cart.length) return alert('Le panier est vide !')

    const supabase = supabaseBrowser()
    const now = new Date().toISOString()

    const orderPayload = {
      table_code: 'T-05',
      items: cart,
      total_amount: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      created_by_role: currentUser.role, // Sauvegarde du rôle : Serveur, Gérant ou Admin
      created_by_name: currentUser.name,
      status: 'pending', // Statut "lancé"
      created_at: now
    }

    // 1. Sauvegarde dans Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([orderPayload])
      .select()

    if (error) {
      alert('Erreur lors du lancement de la commande : ' + error.message)
      return
    }

    // 2. Mise à jour de l'état local avec la commande enregistrée
    setCurrentPrintOrder(data ? data[0] : orderPayload)

    // 3. Impression automatique du bon de commande immédiatement après le lancement
    setTimeout(() => {
      window.print()
    }, 100)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Lancement de commande</h1>

      {/* Rôle actuel / Utilisateur connecté */}
      <div style={{ marginBottom: 16 }}>
        <span>Connecté en tant que : <strong>{currentUser.role}</strong> ({currentUser.name})</span>
      </div>

      {/* Bouton de lancement de la commande */}
      <button
        onClick={handleLaunchOrder}
        style={{
          padding: '14px 28px',
          fontSize: 16,
          fontWeight: 'bold',
          backgroundColor: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        🚀 Lancer la commande (Impression Bon)
      </button>

      {/* Ticket masqué sur l'écran et uniquement visible à l'impression */}
      <div style={{ display: 'none' }}>
        <ReceiptPrint order={currentPrintOrder} />
      </div>
    </div>
  )
}
