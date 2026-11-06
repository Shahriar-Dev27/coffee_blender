import { CATALOG, DEFAULT_SELECTION, OPTION_KEYS, findOption } from '@/config/catalog';
import type { MilkId, Selection, SizeId } from './types';

export type RecipeId = 'espresso' | 'flat-white' | 'oat-latte';
export const RECIPES: readonly {
  id: RecipeId; name: string; note: string; detail: string;
  milk: readonly MilkId[]; sizes: readonly SizeId[];
}[] = [
  { id: 'espresso', name: 'Espresso', note: 'Small cup. Big character.', detail: 'Coffee, just as it is. A short, full-flavored moment.', milk: ['none'], sizes: ['small', 'regular'] },
  { id: 'flat-white', name: 'Flat white', note: 'A little softer around the edges.', detail: 'Espresso meets silky milk. An easy everyday favorite.', milk: ['whole', 'almond', 'soy'], sizes: ['regular', 'large'] },
  { id: 'oat-latte', name: 'Oat latte', note: 'Your softer side, with oat.', detail: 'A longer cup with oat milk and a soft, creamy finish.', milk: ['oat'], sizes: ['regular', 'large'] },
];

export function recipeById(id: RecipeId) {
  return RECIPES.find((recipe) => recipe.id === id)!;
}

export function presetSelection(id: RecipeId): Selection {
  const recipe = recipeById(id);
  return { ...DEFAULT_SELECTION, size: recipe.sizes[0], milk: recipe.milk[0] };
}

export function recipeFor(selection: Selection) {
  return recipeById(selection.milk === 'none' ? 'espresso' : selection.milk === 'oat' ? 'oat-latte' : 'flat-white');
}

export function compatibleSelection(selection: Selection): boolean {
  if (!OPTION_KEYS.every((key) => findOption(key, selection[key]))) return false;
  const recipe = recipeFor(selection);
  return recipe.sizes.includes(selection.size) && recipe.milk.includes(selection.milk);
}

export function selectionLabel(selection: Selection) {
  return `${CATALOG.size.find((size) => size.id === selection.size)!.label} ${recipeFor(selection).name.toLowerCase()}`;
}

export function selectionNotes(selection: Selection) {
  return [
    findOption('blend', selection.blend)!.label,
    `${selection.roast} roast`,
    selection.milk === 'none' ? 'no milk' : `${selection.milk} milk`,
    selection.sweetener === 'none' ? 'unsweetened' : findOption('sweetener', selection.sweetener)!.label,
  ].join(' · ');
}
