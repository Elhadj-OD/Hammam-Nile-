'use client'

import React, { forwardRef } from 'react'

/**
 * Composant de ticket d'impression thermique pour cuisine / caisse (Format 80mm / 58mm)
 * S'imprime automatiquement dès qu'une commande est lancée.
 */
export const ReceiptPrint = forwardRef(({ order }, ref) => {
  if (!order) return null

  // Formatage de la date et l'heure au moment exact du lancement de la commande
  const formattedDate = new Date(order.created_at || Date.now()).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div ref={ref} className="thermal-receipt">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .thermal-receipt, .thermal-receipt * {
            visibility: visible !important;
          }
          .thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 8px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }

        .thermal-receipt {
          width: 80mm;
          padding: 10px;
          font-family: 'Courier New', Courier, monospace;
          background: #fff;
          color: #000;
          border: 1px dashed #ccc;
          margin: 10px auto;
        }

        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .receipt-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0 0 4px 0;
        }

        .receipt-info {
          margin-bottom: 8px;
          font-size: 11px;
          line-height: 1.4;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
        }

        .receipt-info div {
          display: flex;
          justify-content: space-between;
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }

        .receipt-table th {
          border-bottom: 1px solid #000;
          text-align: left;
          padding: 4px 0;
          font-size: 11px;
        }

        .receipt-table td {
          padding: 4px 0;
          vertical-align: top;
          font-size: 12px;
        }

        .text-right {
          text-align: right;
        }

        .total-section {
          border-top: 1px dashed #000;
          padding-top: 6px;
          font-size: 14px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
        }

        .receipt-footer {
          margin-top: 12px;
          text-align: center;
          font-size: 10px;
          border-top: 1px dashed #000;
          padding-top: 6px;
        }
      `}</style>

      <div className="receipt-header">
        <h2 className="receipt-title">BON DE COMMANDE</h2>
        <div>Table / Réf : <strong>{order.table_code || order.id || 'N/A'}</strong></div>
      </div>

      <div className="receipt-info">
        <div>
          <span>Heure d'envoi :</span>
          <span>{formattedDate}</span>
        </div>
        <div>
          <span>Lancée par :</span>
          <span><strong>{order.created_by_role || 'Serveur'}</strong> {order.created_by_name ? `(${order.created_by_name})` : ''}</span>
        </div>
      </div>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>Qté</th>
            <th>Article</th>
            <th className="text-right">P.U</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item, idx) => (
            <tr key={idx}>
              <td><strong>{item.quantity || item.qty || 1}x</strong></td>
              <td>
                {item.name || item.label || item.title}
                {item.notes && <div style={{ fontSize: '10px', fontStyle: 'italic' }}>* {item.notes}</div>}
              </td>
              <td className="text-right">{item.price ? `${item.price} MRU` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.total_amount && (
        <div className="total-section">
          <span>TOTAL :</span>
          <span>{order.total_amount} MRU</span>
        </div>
      )}

      <div className="receipt-footer">
        <p>*** CAFÉ DUGOUT ***</p>
        <p>Bon de cuisine / bar - Imprimé à la commande</p>
      </div>
    </div>
  )
})

ReceiptPrint.displayName = 'ReceiptPrint'

export default ReceiptPrint
