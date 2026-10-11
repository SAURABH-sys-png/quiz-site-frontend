import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DECKS } from './decks/index.js';
import { SlideDeckPage, SlidesIndexPage } from './SlidesPage.jsx';

const deck = DECKS[0];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderDeck(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/admin/slides/${deck.id}${search}`]}>
      <Routes>
        <Route path="/admin/slides" element={<SlidesIndexPage />} />
        <Route
          path="/admin/slides/:deckId"
          element={
            <>
              <SlideDeckPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const currentSlide = () => screen.getAllByRole('article')[0];

describe('lecture decks', () => {
  it('every slide has a unique id, a title and an explanation', () => {
    for (const d of DECKS) {
      const ids = d.slides.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of d.slides) {
        expect(s.title).toBeTruthy();
        expect(s.notes?.length).toBeGreaterThan(80);
      }
    }
  });
});

describe('SlideDeckPage', () => {
  it('navigates with the keyboard and keeps the slide number in the URL', () => {
    renderDeck();
    expect(currentSlide()).toHaveAccessibleName(`1 of ${deck.slides.length}: ${deck.slides[0].title}`);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(currentSlide()).toHaveAccessibleName(`2 of ${deck.slides.length}: ${deck.slides[1].title}`);
    expect(screen.getByTestId('location')).toHaveTextContent('?s=2');

    fireEvent.keyDown(window, { key: 'End' });
    expect(currentSlide()).toHaveAccessibleName(new RegExp(`^${deck.slides.length} of`));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(currentSlide()).toHaveAccessibleName(new RegExp(`^${deck.slides.length} of`));

    fireEvent.keyDown(window, { key: 'Home' });
    expect(currentSlide()).toHaveAccessibleName(new RegExp('^1 of'));
  });

  it('opens a slide from the URL and clamps out-of-range numbers', () => {
    renderDeck('?s=3');
    expect(currentSlide()).toHaveAccessibleName(new RegExp(`^3 of .*${deck.slides[2].title}`));
  });

  it('shows the explanation and jumps from the overview', () => {
    renderDeck('?s=999');
    expect(currentSlide()).toHaveAccessibleName(new RegExp(`^${deck.slides.length} of`));
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(deck.slides[3].title) }));
    expect(currentSlide()).toHaveAccessibleName(new RegExp(`^4 of`));
    expect(screen.getByText('Explanation')).toBeInTheDocument();
  });

  it('reports an unknown deck', () => {
    render(
      <MemoryRouter initialEntries={['/admin/slides/nope']}>
        <Routes>
          <Route path="/admin/slides/:deckId" element={<SlideDeckPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Slide deck not found')).toBeInTheDocument();
  });
});
