'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PICKUP_SLOTS } from '@/config/catalog';
import { orderStore, useOrder } from '@/order/store';
import { formatCents, lineTotalCents, subtotalCents } from '@/order/price';
import { selectionLabel, selectionNotes } from '@/order/recipes';
import { validatePickup, PICKUP_FIELD_ORDER, type PickupErrorCode, type PickupField } from '@/order/validate';
import { Quantity } from '@/components/order/Quantity';
const errorText = (field: PickupField, code: PickupErrorCode) => code === 'tooLong' ? 'Please use a shorter value.' : field === 'name' ? 'Please enter your name.' : field === 'email' ? 'Please enter a valid email address.' : 'Please choose a pickup time.';
export function CartDrawer() {
 const open = useOrder((s) => s.drawer);
 const lines = useOrder((s) => s.lines);
 const status = useOrder((s) => s.status);
 const receipt = useOrder((s) => s.receipt);
 const error = useOrder((s) => s.error);
 const dialog = useRef<HTMLDialogElement>(null);
 const opener = useRef<HTMLElement | null>(null);
 const returnToStart = useRef(false);
 const form = useRef<HTMLFormElement>(null);
 const [errors, setErrors] = useState<Partial<Record<PickupField, PickupErrorCode>>>({});
 const busy = status === 'pending';
 useEffect(() => {
   const node = dialog.current;
   if (!node) return;
   if (open && !node.open) {
     opener.current = document.activeElement as HTMLElement;
     node.showModal();
     document.body.dataset.checkout = 'open';
   } else if (!open && node.open) {
     node.close();
     delete document.body.dataset.checkout;
     const target = returnToStart.current ? document.getElementById('arrival') : opener.current;
     target?.focus({ preventScroll: true });
     returnToStart.current = false;
   }
   return () => { delete document.body.dataset.checkout; };
 }, [open]);
 useEffect(() => {
   if (status === 'success') dialog.current?.querySelector<HTMLElement>('.receipt-heading')?.focus();
 }, [status]);
 async function onSubmit(event: FormEvent<HTMLFormElement>) {
   event.preventDefault();
   if (busy) return;
   const data = new FormData(event.currentTarget);
   const checked = validatePickup({ name: data.get('name'), email: data.get('email'), slotId: data.get('slotId') });
   if (!checked.ok) {
     setErrors(checked.errors);
     const first = PICKUP_FIELD_ORDER.find((field) => checked.errors[field]);
     form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
     return;
   }
   setErrors({});
   await orderStore.getState().submit(checked.value);
   if (orderStore.getState().status === 'success') form.current?.reset();
 }
 const close = () => orderStore.getState().closeDrawer();
 return <dialog ref={dialog} className="cart-dialog" aria-labelledby="cart-heading" onCancel={close} onClose={close} onClick={(event) => {
   if (event.target === event.currentTarget) {
     const box = event.currentTarget.getBoundingClientRect();
     if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
   }
 }}>
   <div className="drawer-heading"><span className="eyebrow">BREOU CAFFEE · YOUR MOMENT</span><button type="button" className="close-button" onClick={close} aria-label="Close order">×</button></div>
   {receipt && status === 'success' ? <div className="receipt">
     <span className="receipt-stamp" aria-hidden="true">✓</span><p className="eyebrow">Demo order {receipt.orderNumber}</p>
     <h2 id="cart-heading" className="receipt-heading" tabIndex={-1}>A little moment,<br />made yours.</h2>
     <p>Thanks for stopping by, {receipt.pickup.name}.</p>
     <div className="receipt-lines">{receipt.lines.map((line, i) => <div key={i}><span>{line.quantity} × {selectionLabel(line.selection)}</span><strong>{formatCents(line.unitCents * line.quantity)}</strong></div>)}<div className="receipt-subtotal"><span>Demo total</span><strong>{formatCents(receipt.subtotalCents)}</strong></div></div>
     <p className="receipt-disclosure"><strong>This is a demo checkout.</strong><br /><span>Nothing was sent and nothing was charged.</span></p>
     <button type="button" className="button button-primary" onClick={() => { returnToStart.current = true; orderStore.getState().reset(); window.location.hash = 'arrival'; }}>Start a new order <span aria-hidden="true">↗</span></button>
   </div> : <>
     <h2 id="cart-heading">A cup for you.<br />Maybe two.</h2><p className="drawer-intro">Your little lineup, just the way you like it.</p>
     {lines.length === 0 ? <div className="empty-order"><p>Your order is waiting for its first cup.</p><button type="button" className="button button-primary" onClick={close}>Make yours ↗</button></div> : <>
       <ul className="cart-lines">{lines.map((line) => <li key={line.id}>
         <div className="cart-line-top"><h3>{selectionLabel(line.selection)}</h3><strong>{formatCents(lineTotalCents(line))}</strong></div>
         <p>{selectionNotes(line.selection)}</p><div className="cart-line-bottom"><Quantity label={selectionLabel(line.selection)} value={line.quantity} disabled={busy} onChange={(value) => orderStore.getState().setQuantity(line.id, value)} /><button type="button" disabled={busy} className="text-button" aria-label={`Remove ${selectionLabel(line.selection)}`} onClick={() => orderStore.getState().remove(line.id)}>Remove</button></div>
       </li>)}</ul>
       <div className="cart-subtotal"><span>Subtotal</span><strong>{formatCents(subtotalCents(lines))}</strong></div>
       <form ref={form} noValidate onSubmit={onSubmit} aria-busy={busy}>
         <h3 className="pickup-heading">A name for your cup</h3><p className="form-help">Demo pickup details stay in this browser session.</p>
         <fieldset disabled={busy} className="pickup-fields"><legend className="sr-only">Pickup details</legend>
           <div className="form-field"><label htmlFor="pickup-name">Your name</label><input id="pickup-name" name="name" autoComplete="given-name" maxLength={80} required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <p id="name-error" className="form-error"><span aria-hidden="true">! </span>{errorText('name', errors.name)}</p>}</div>
           <div className="form-field"><label htmlFor="pickup-email">Email address</label><input id="pickup-email" name="email" type="email" autoComplete="email" maxLength={254} required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <p id="email-error" className="form-error"><span aria-hidden="true">! </span>{errorText('email', errors.email)}</p>}</div>
           <div className="form-field"><label htmlFor="pickup-slot">Pickup time</label><select id="pickup-slot" name="slotId" defaultValue="" required aria-invalid={!!errors.slotId} aria-describedby={errors.slotId ? 'slotId-error' : undefined}><option value="" disabled>Choose a time</option>{PICKUP_SLOTS.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}</select>{errors.slotId && <p id="slotId-error" className="form-error"><span aria-hidden="true">! </span>{errorText('slotId', errors.slotId)}</p>}</div>
         </fieldset>
         {error && <p className="form-error" role="alert">{error}</p>}
         <p className="checkout-disclosure">This is a demo checkout. Nothing will be sent or charged.</p>
         <button type="submit" className="button button-primary submit-order" disabled={busy}>{busy ? 'Making your demo receipt…' : `Place demo order · ${formatCents(subtotalCents(lines))}`}<span aria-hidden="true">↗</span></button>
       </form>
     </>}
   </>}
 </dialog>;
}
