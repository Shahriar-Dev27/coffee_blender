import { CanvasTexture, Color, SRGBColorSpace } from 'three';
export function brandTexture() {
 const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
 const ctx = canvas.getContext('2d')!;
 const style = getComputedStyle(document.documentElement);
 ctx.fillStyle = style.getPropertyValue('--color-accent').trim();
 ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
 ctx.font = '800 146px "Bricolage Grotesque", sans-serif';
 ctx.fillText('BREOU', 512, 220);
 ctx.font = '600 31px "Instrument Sans", sans-serif';
 ctx.letterSpacing = '14px';
 ctx.fillText('CAFFEE', 512, 326);
 const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
 return texture;
}
export function coffeeTexture(milk: boolean) {
 const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
 const ctx = canvas.getContext('2d')!;
 const gradient = ctx.createRadialGradient(240, 230, 30, 256, 256, 260);
 gradient.addColorStop(0, new Color(milk ? 0xb98b64 : 0x462514).getStyle());
 gradient.addColorStop(.7, new Color(milk ? 0xcaa37b : 0x71401f).getStyle());
 gradient.addColorStop(.95, new Color(milk ? 0xe0c8a0 : 0xb9884d).getStyle());
 gradient.addColorStop(1, 'saddlebrown');
 ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512);
 for (let i = 0; i < 800; i++) {
  const x = (Math.sin(i * 78.23) * 40000) % 512, y = (Math.cos(i * 39.5) * 30000) % 512;
  ctx.globalAlpha = .16; ctx.fillStyle = i % 2 ? 'wheat' : 'saddlebrown';
  ctx.beginPath(); ctx.arc(Math.abs(x), Math.abs(y), i % 4 + 1, 0, Math.PI * 2); ctx.fill();
 }
 ctx.globalAlpha = 1;
 if (milk) {
  ctx.save(); ctx.translate(256, 255); ctx.rotate(-.25); ctx.scale(1.3, 1.3); ctx.fillStyle = 'oldlace';
  for (let i = 0; i < 7; i++) {
   const y = 83 - i * 25, width = 82 - i * 9;
   for (const sign of [-1, 1]) {
    ctx.save(); ctx.translate(sign * width * .46, y); ctx.rotate(sign * -.38);
    ctx.beginPath(); ctx.ellipse(0, 0, width * .66, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
   }
  }
  ctx.beginPath(); ctx.moveTo(-5, 105); ctx.quadraticCurveTo(7, -22, 0, -98); ctx.lineTo(10, -60); ctx.quadraticCurveTo(0, 25, 5, 105); ctx.fill();
  ctx.restore();
 }
 const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
 return texture;
}

export function steamTexture() {
 const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
 const ctx = canvas.getContext('2d')!;
 const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
 gradient.addColorStop(0, 'white'); gradient.addColorStop(1, 'transparent');
 ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
 return new CanvasTexture(canvas);
}
