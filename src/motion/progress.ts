type Listener = () => void;
let progress = 0;
const listeners = new Set<Listener>();
export const storyProgress = {
 get: () => progress,
 set(value: number) { progress = Math.max(0, Math.min(1, value)); listeners.forEach((listener) => listener()); },
 subscribe(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
