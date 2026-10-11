import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { FullPageSpinner } from '../../components/ui.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { AnalyticsPage } from './analytics/AnalyticsPage.jsx';
import { AccessKeysPage } from './keys/AccessKeysPage.jsx';
import { LiveDashboardPage } from './live/LiveDashboardPage.jsx';
import { QuestionEditorPage } from './questions/QuestionEditorPage.jsx';
import { ParticipantsPage } from './roster/ParticipantsPage.jsx';
import { TestDetailPage } from './tests/TestDetailPage.jsx';
import { TestsPage } from './tests/TestsPage.jsx';

// Lecture decks are large and rarely opened, so they load on demand.
const SlidesIndexPage = lazy(() => import('./slides/SlidesPage.jsx').then((m) => ({ default: m.SlidesIndexPage })));
const SlideDeckPage = lazy(() => import('./slides/SlidesPage.jsx').then((m) => ({ default: m.SlideDeckPage })));
const page = (element) => <Suspense fallback={<FullPageSpinner />}>{element}</Suspense>;

/** The whole admin area. Lazy-loaded from App.jsx, so none of it is in the participant bundle. */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="tests" replace />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="tests/:id" element={<TestDetailPage />} />
        <Route path="tests/:id/questions/new" element={<QuestionEditorPage />} />
        <Route path="tests/:id/questions/:qid" element={<QuestionEditorPage />} />
        <Route path="tests/:id/live" element={<LiveDashboardPage />} />
        <Route path="tests/:id/analytics" element={<AnalyticsPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="access-keys" element={<AccessKeysPage />} />
        <Route path="slides" element={page(<SlidesIndexPage />)} />
        <Route path="slides/:deckId" element={page(<SlideDeckPage />)} />
        <Route path="*" element={<Navigate to="tests" replace />} />
      </Route>
    </Routes>
  );
}
