'use client';
import { useState } from 'react';
import { CATALOG } from '@/config/catalog';
import { RECIPES, recipeById, presetSelection } from '@/order/recipes';
import { formatCents, formatDeltaCents, priceCents } from '@/order/price';
import { orderStore, useOrder } from '@/order/store';
import { Quantity } from './Quantity';
import type { OptionKey, Selection } from '@/order/types';
export function OrderPanel() {
  const selection = useOrder((s) => s.selection);
  const recipeId = useOrder((s) => s.recipe);
  const pending = useOrder((s) => s.status === 'pending');
  const lines = useOrder((s) => s.lines);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const recipe = recipeById(recipeId);
  const choose = <K extends OptionKey>(key: K, value: Selection[K]) => { orderStore.getState().choose(key, value); setNotice(''); };
  return <div className="order-panel" data-reveal="card">
    <fieldset disabled={pending} className="recipe-choices"><legend className="field-legend">01 <span>Find your favorite</span></legend>
      {RECIPES.map((item) => <label className="recipe-choice" key={item.id}>
        <input type="radio" name="recipe" value={item.id} checked={recipeId === item.id} onChange={() => { orderStore.getState().chooseRecipe(item.id); setNotice(''); }} />
        <span className="radio-mark" aria-hidden="true" /><span className="recipe-choice-copy"><strong>{item.name}</strong><small>{item.note}</small></span>
        <span className="recipe-price">{formatCents(priceCents(presetSelection(item.id)))}</span>
      </label>)}
    </fieldset>
    <div className="recipe-customization"><fieldset disabled={pending}><legend className="field-legend">02 <span>A little more you</span></legend>
      <div className="ingredient-row"><span id="milk-label">Milk</span><div className="segmented" role="group" aria-labelledby="milk-label">{recipe.milk.map((id) => <label key={id}><input type="radio" name="milk" checked={selection.milk === id} onChange={() => choose('milk', id)} /><span>{id === 'none' ? 'No milk' : CATALOG.milk.find((m) => m.id === id)!.label}</span></label>)}</div></div>
      <div className="ingredient-row"><label htmlFor="sweetener">Something sweet</label><select id="sweetener" value={selection.sweetener} onChange={(e) => choose('sweetener', e.target.value as Selection['sweetener'])}>{CATALOG.sweetener.map((s) => <option value={s.id} key={s.id}>{s.id === 'none' ? 'No, thank you' : `${s.label}${s.deltaCents ? ` (${formatDeltaCents(s.deltaCents)})` : ''}`}</option>)}</select></div>
      <div className="ingredient-row"><span id="size-label">Your size</span><div className="segmented" role="group" aria-labelledby="size-label">{recipe.sizes.map((id) => <label key={id}><input type="radio" name="size" checked={selection.size === id} onChange={() => choose('size', id)} /><span>{CATALOG.size.find((s) => s.id === id)!.label}</span></label>)}</div></div>
    </fieldset>
    <details className="fine-tune"><summary>For the coffee curious <span aria-hidden="true">+</span></summary>
      <div className="ingredient-row"><label htmlFor="blend">Blend</label><select disabled={pending} id="blend" value={selection.blend} onChange={(e) => choose('blend', e.target.value as Selection['blend'])}>{CATALOG.blend.map((b) => <option value={b.id} key={b.id}>{b.label}{b.deltaCents ? ` (${formatDeltaCents(b.deltaCents)})` : ''}</option>)}</select></div>
      <div className="ingredient-row"><label htmlFor="roast">Roast</label><select disabled={pending} id="roast" value={selection.roast} onChange={(e) => choose('roast', e.target.value as Selection['roast'])}>{CATALOG.roast.map((r) => <option value={r.id} key={r.id}>{r.label}</option>)}</select></div>
    </details></div>
    <div className="order-total"><div><span className="eyebrow">Your little ritual</span><p className="cup-price" aria-live="polite" aria-atomic="true" data-testid="cup-price">{formatCents(priceCents(selection) * quantity)}</p></div><Quantity value={quantity} onChange={setQuantity} disabled={pending} /></div>
    <button type="button" className="button button-primary add-button" disabled={pending} onClick={() => { const ok = orderStore.getState().add(quantity); setNotice(ok ? `${quantity === 1 ? 'Your cup is' : 'Your cups are'} in the order. Ready when you are.` : 'Up to 10 of each cup and 20 different cups per order. Please review your order.'); }}>Add to order <span aria-hidden="true">↗</span></button>
    <div className="order-feedback"><p role="status">{notice}</p>{lines.length > 0 && <button type="button" className="text-button" onClick={() => orderStore.getState().openDrawer()}>Review order <span aria-hidden="true">↗</span></button>}</div>
    <p className="demo-note">Made for a moment of play. Demo menu & prices.<br />No real order. No payment.</p>
  </div>;
}