import { STAGES } from '@/config/stages';
import { SkipLink } from '@/components/shell/SkipLink';
import { Header } from '@/components/shell/Header';
import { Footer } from '@/components/shell/Footer';
import { StageRail } from '@/components/stage/StageRail';
import { StageTrack } from '@/components/stage/StageTrack';
import { StageSection } from '@/components/stage/StageSection';
import { MotionRoot } from '@/components/stage/MotionRoot';
import { CartDrawer } from '@/components/cart/CartDrawer';

export default function Home() {
  return (
    <>
      <SkipLink />
      <Header />
      <StageRail />
      <main id="main">
        <StageTrack>
          {STAGES.map((stage) => (
            <StageSection key={stage.id} stage={stage} />
          ))}
        </StageTrack>
      </main>
      <Footer />
      <CartDrawer />
      <MotionRoot />
    </>
  );
}
