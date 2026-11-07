'use client'

import { useRef, useState } from 'react'
import Icon from '@/components/Icon'
import { CATEGORIES, M, SPEC_SLUGS } from '@/lib/config'
import { toast } from '@/lib/toast'
import { usePos } from './PosProvider'

const safeImg = u => (typeof u === 'string' && /^(https?:\/\/|data:image\/)/i.test(u) ? u : '')

const EMPTY = { id: '', name: '', desc: '', cat: CATEGORIES[0].slug, price: '', img: '' }

export default function MenuTab() {
  const { menu, categories, saveCategoryIcon, saveDish, toggleDish, deleteDish } = usePos()
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onPhoto = file => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Choisissez un fichier image', 'error')
    if (file.size > 15e6) return toast('Image trop lourde (15 Mo max)', 'error')
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, 640 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      set('img', c.toDataURL('image/jpeg', 0.78))
      URL.revokeObjectURL(url)
      toast('Photo prête (elle sera envoyée à l’enregistrement)')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      toast('Image illisible (JPG ou PNG)', 'error')
    }
    img.src = url
  }

  /** Icône de rubrique : recadrage carré centré, 256 px, PNG (transparence conservée). */
  const onIcon = (slug, file) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast('PNG, JPG ou WebP uniquement', 'error')
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = c.height = 256
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256)
      URL.revokeObjectURL(url)
      saveCategoryIcon(slug, c.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      toast('Image illisible', 'error')
    }
    img.src = url
  }

  const submit = async () => {
    if (!form.name.trim() || !(Number(form.price) > 0)) return toast('Nom et prix requis', 'error')
    setBusy(true)
    await saveDish(
      { name: form.name.trim(), desc: form.desc.trim(), cat: form.cat, price: Number(form.price), img: form.img },
      form.id || null
    )
    setBusy(false)
    setForm(EMPTY)
    if (fileRef.current) fileRef.current.value = ''
  }

  const edit = d =>
    setForm({ id: d.id, name: d.name, desc: d.desc, cat: d.cat, price: String(d.price), img: d.img })

  return (
    <div className="card p-4">
      <h2 className="serif mb-3 text-xl font-bold">Menu &amp; Produits ({menu.length})</h2>

      <div className="mb-5">
        <h3 className="serif mb-2 text-sm font-bold">Icônes des rubriques (haut du menu client)</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {SPEC_SLUGS.map(slug => {
            const cat = categories.find(c => c.slug === slug)
            const label = cat?.label || CATEGORIES.find(c => c.slug === slug)?.label || slug
            return (
              <div key={slug}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={safeImg(cat?.icon_url) || `/brand/ico-${slug}.webp`}
                  alt=""
                  className="mx-auto h-16 w-16 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 2px #ffe433' }}
                />
                <div className="my-1 text-xs">{label}</div>
                <label className="btn sm cursor-pointer">
                  Changer
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={e => {
                      onIcon(slug, e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
                {cat?.icon_url && (
                  <button type="button" className="mut mx-auto mt-1 block text-xs underline" onClick={() => saveCategoryIcon(slug, '')}>
                    Rétablir
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        <input
          className="inp sm:col-span-2"
          placeholder="Nom du plat"
          value={form.name}
          maxLength={80}
          onChange={e => set('name', e.target.value)}
        />
        <select className="inp" value={form.cat} onChange={e => set('cat', e.target.value)}>
          {CATEGORIES.map(c => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="inp"
          placeholder="Prix (MRU)"
          value={form.price}
          min="1"
          onChange={e => set('price', e.target.value)}
        />
        <input
          className="inp sm:col-span-5"
          placeholder="Description (facultatif)"
          value={form.desc}
          maxLength={300}
          onChange={e => set('desc', e.target.value)}
        />

        <div className="flex items-center gap-3 sm:col-span-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl"
            style={{ background: 'rgba(255,255,255,.08)' }}
          >
            {safeImg(form.img) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeImg(form.img)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="gt opacity-70">
                <Icon name="plate" size={26} />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label className="btn w-full cursor-pointer">
              <Icon name="camera" size={14} /> Ajouter / changer la photo
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => onPhoto(e.target.files?.[0])}
              />
            </label>
            {form.img && (
              <button type="button" className="mut mt-1 text-xs underline" onClick={() => set('img', '')}>
                Retirer la photo
              </button>
            )}
          </div>
        </div>

        <button className="btn gold sm:col-span-5" onClick={submit} disabled={busy}>
          {busy ? 'Enregistrement…' : form.id ? 'Mettre à jour le plat' : 'Enregistrer le plat'}
        </button>
        {form.id && (
          <button className="btn sm:col-span-5" onClick={() => setForm(EMPTY)}>
            Annuler la modification
          </button>
        )}
      </div>

      <div className="space-y-2">
        {menu.map(m => (
          <div key={m.id} className="row">
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg"
              style={{ background: 'rgba(255,255,255,.08)' }}
            >
              {safeImg(m.img) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeImg(m.img)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="gt opacity-70">
                  <Icon name="plate" size={18} />
                </span>
              )}
            </div>
            <div className={'flex-1 text-sm ' + (m.on ? '' : 'opacity-40')}>
              {m.name}
              <div className="mut text-xs">
                {m.cat} · {M(m.price)}
                {!m.on ? ' · masqué' : ''}
              </div>
            </div>
            <button className="btn sm" onClick={() => edit(m)}>
              Modifier
            </button>
            <button className="btn sm" onClick={() => toggleDish(m)}>
              {m.on ? 'Masquer' : 'Afficher'}
            </button>
            <button
              className="btn sm red"
              onClick={() => {
                if (confirm('Supprimer ' + m.name + ' ?')) deleteDish(m.id)
              }}
              aria-label={'Supprimer ' + m.name}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
