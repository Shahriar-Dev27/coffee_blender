import { SkipLink } from '@/components/shell/SkipLink';
import { Header } from '@/components/shell/Header';
import { Footer } from '@/components/shell/Footer';
import { StageTrack } from '@/components/stage/StageTrack';
import { MotionRoot } from '@/components/stage/MotionRoot';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { OrderPanel } from '@/components/order/OrderPanel';
import { StageStill } from '@/components/stage/StageStill';
const Arrow = () => <span aria-hidden="true">↗</span>;
export default function Home() {
 return <><SkipLink /><Header /><main id="main"><StageTrack>
  <section id="arrival" className="chapter hero" aria-labelledby="arrival-heading" tabIndex={-1}>
    <div className="hero-kicker"><span>COFFEE. A LITTLE MORE PERSONAL.</span><span>EST. IN THE EVERYDAY.</span></div>
    <h1 id="arrival-heading" className="hero-word">BREOU<span className="sr-only"> CAFFEE — A little everyday ritual</span></h1>
    <div className="hero-orbit" aria-hidden="true" /><StageStill stage={1} />
    <div className="hero-bottom"><div className="hero-copy"><p className="hero-tagline">Life happens.<br />Coffee helps.</p><p>A cup, a pause, a little possibility.<br />Let’s make a moment of it.</p><a className="button button-primary" href="#order">Find your everyday <Arrow /></a></div>
    <a className="scroll-cue" href="#ritual"><span className="scroll-arrow" aria-hidden="true">↓</span><span>A LITTLE SCROLL.<br />A GOOD CUP.</span></a>
    <div className="hero-side-note"><span className="tiny-star" aria-hidden="true">✳</span><p>Your coffee.<br />Your kind of day.</p></div></div>
    <div className="hero-footnote"><span>THE EVERYDAY RITUAL, REIMAGINED.</span><span>01 — A FRESH START</span></div>
  </section>
  <section id="ritual" className="chapter invitation" aria-labelledby="ritual-heading">
    <div className="chapter-copy"><p className="eyebrow">01 / THE LITTLE THINGS</p><h2 id="ritual-heading">Not just coffee.<br />A small<br /><span className="outline-type">reset.</span></h2><p className="body-lg">Before the to-dos. Between the big things. There’s a little space that’s just for you.</p><p className="hand-note">We’ll put the kettle on.</p></div>
    <div className="ritual-stamp" aria-hidden="true"><span>A LITTLE</span><strong>pause</strong><span>GOES A LONG WAY</span></div><StageStill stage={1} />
  </section>
  <section id="flavor" className="chapter flavor" aria-labelledby="flavor-heading">
    <div className="chapter-copy"><p className="eyebrow">02 / FIND YOUR FLAVOR</p><h2 id="flavor-heading">Big character.<br />Little cup.</h2><p className="body-lg">A bold espresso? A silky flat white?<br />Or a softer oat kind of morning?</p><a href="#order" className="text-link">There’s a cup for that <Arrow /></a><div className="flavor-notes"><span>01 &nbsp; Espresso</span><span>02 &nbsp; Flat white</span><span>03 &nbsp; Oat latte</span></div></div>
    <StageStill stage={2} /><div className="ingredient-callout"><span aria-hidden="true">↗</span> It starts with the beans.</div>
  </section>
  <section id="pour" className="chapter pour" aria-labelledby="pour-heading">
    <div className="chapter-copy"><p className="eyebrow">03 / TAKE IT SLOW</p><h2 id="pour-heading">Good things<br />take a<br /><span className="outline-type">moment.</span></h2><p className="body-lg">A steady pour. A little crema.<br />The start of something good.</p></div><StageStill stage={3} /><div className="pour-caption"><span aria-hidden="true">↗</span> A little patience. A lot of flavor.</div>
  </section>
  <section id="make-yours" className="chapter personalize" aria-labelledby="personalize-heading">
    <div className="chapter-copy"><p className="eyebrow">04 / YOUR OWN WAY</p><h2 id="personalize-heading">A splash.<br />A swirl.<br /><span className="outline-type">All you.</span></h2><p className="body-lg">Something silky. Something sweet.<br />Or nothing extra at all.</p><p className="small-note">The best cup is the one you like.</p></div><StageStill stage={4} /><span className="milk-label">A softer finish. <span aria-hidden="true">↗</span></span>
  </section>
  <section id="order" className="chapter counter" aria-labelledby="order-heading" tabIndex={-1}>
    <div className="counter-intro"><p className="eyebrow">05 / MEET YOUR EVERYDAY</p><h2 id="order-heading">Your cup.<br />Your call.</h2><p>Good days start somewhere.<br />Yours can start right here.</p><span className="counter-star" aria-hidden="true">✳</span></div><StageStill stage={5} /><OrderPanel />
    <noscript><p className="noscript-note">Turn on JavaScript to customize a cup and try demo checkout. The demo menu: Espresso from $3.50, Flat white from $4.00, Oat latte from $4.60. No real orders or payments.</p></noscript>
    <div className="counter-baseline" aria-hidden="true"><span>BREOU CAFFEE</span><span>MADE A LITTLE MORE YOU.</span></div>
  </section>
 </StageTrack></main><Footer /><CartDrawer /><MotionRoot /></>;
}