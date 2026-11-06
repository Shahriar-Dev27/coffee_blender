import { BOOT_SCRIPT } from '@/lib/bootScript';

/** Inline pre-paint script; renders a static string only. */
export function BootScript() {
  return <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />;
}
