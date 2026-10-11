import { constructorsDestructorsDeck } from './constructorsDestructors.jsx';

/** Lecture decks shown under Admin → Slides. Add new decks here. */
export const DECKS = [constructorsDestructorsDeck];

export function findDeck(id) {
  return DECKS.find((deck) => deck.id === id) ?? null;
}
