import { OP_LABEL, ST_LABEL } from '@/lib/config'

/** v_orders_full (Supabase) -> objet utilisé par l'interface */
export function mapOrder(o) {
  const closed = !!o.closed_at
  return {
    id: o.id,
    no: o.order_no,
    table: o.table_label,
    tableCode: o.table_code,
    status: o.status,
    // une commande soldée est affichée comme "Servi"
    st: closed && o.status !== 'annule' ? 'Servi' : ST_LABEL[o.status] || 'Attente',
    items: (o.items || []).map(i => ({
      id: i.id,
      menu_item_id: i.menu_item_id,
      name: i.name,
      price: Number(i.price),
      qty: i.qty,
      note: i.note || ''
    })),
    pays: (o.pays || []).map(p => ({
      amt: Number(p.amt),
      op: OP_LABEL[p.op] || p.op,
      ph: p.ph || '',
      t: new Date(p.t).getTime()
    })),
    subtotal: Number(o.subtotal || 0),
    paid: Number(o.paid || 0),
    t: new Date(o.opened_at).getTime(),
    closed
  }
}

export function mapExpense(e) {
  return { id: e.id, n: e.label, p: Number(e.amount), t: new Date(e.spent_at).getTime() }
}

export function mapDish(m) {
  return {
    id: m.id,
    name: m.name,
    desc: m.description || '',
    cat: m.category_slug,
    price: Number(m.price),
    img: m.image_url || '',
    on: m.is_available
  }
}
