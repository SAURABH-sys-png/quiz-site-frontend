import { useState } from 'react';
import { Alert, Button, Checkbox, Field, Input, Select, Textarea } from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { fromLocalInput, toLocalInput } from '../../../lib/time.js';

function initialForm(test) {
  return {
    title: test.title,
    description: test.description ?? '',
    startsAt: toLocalInput(test.startsAt),
    endsAt: toLocalInput(test.endsAt),
    durationMinutes: test.durationMinutes,
    allowedSections: (test.allowedSections ?? []).join(', '),
    settings: { ...test.settings },
  };
}

export function TestSettingsForm({ test, onSaved }) {
  const [form, setForm] = useState(() => initialForm(test));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const ended = test.status === 'ended';

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setSetting = (key, value) => setForm((f) => ({ ...f, settings: { ...f.settings, [key]: value } }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const body = {
        title: form.title,
        description: form.description,
        startsAt: fromLocalInput(form.startsAt),
        endsAt: fromLocalInput(form.endsAt),
        durationMinutes: Number(form.durationMinutes),
        allowedSections: form.allowedSections
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        settings: { ...form.settings, maxAttempts: Number(form.settings.maxAttempts) },
      };
      const { test: updated } = await api(`/admin/tests/${test.id}`, { method: 'PATCH', body });
      setSaved(true);
      onSaved?.(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const s = form.settings;
  return (
    <form onSubmit={save} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      {saved && (
        <Alert tone="success" onClose={() => setSaved(false)}>
          Settings saved.
        </Alert>
      )}
      {ended && <Alert tone="info">This test has ended and can no longer be edited.</Alert>}
      <fieldset disabled={ended} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" className="md:col-span-2">
            {(id) => <Input id={id} value={form.title} onChange={(e) => set('title', e.target.value)} required />}
          </Field>
          <Field label="Description (shown to participants)" className="md:col-span-2">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            )}
          </Field>
          <Field label="Opens at" hint="Optional. A published test goes live automatically at this time.">
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
              />
            )}
          </Field>
          <Field label="Closes at" hint="Optional. The test ends and open attempts are submitted at this time.">
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
              />
            )}
          </Field>
          <Field label="Duration per participant (minutes)">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={1440}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', e.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Allowed sections" hint="Comma-separated, e.g. A, B. Leave empty for everyone.">
            {(id) => (
              <Input id={id} value={form.allowedSections} onChange={(e) => set('allowedSections', e.target.value)} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
          <Field label="Feedback to participants">
            {(id) => (
              <Select id={id} value={s.feedbackMode} onChange={(e) => setSetting('feedbackMode', e.target.value)}>
                <option value="after_submit">After they submit (default)</option>
                <option value="after_test">After the test ends</option>
                <option value="immediate">Immediately, per question (answers lock)</option>
              </Select>
            )}
          </Field>
          <Field label="Attempts allowed" hint="The latest attempt counts.">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={20}
                value={s.maxAttempts}
                onChange={(e) => setSetting('maxAttempts', e.target.value)}
              />
            )}
          </Field>
          <Checkbox
            label="Shuffle question order"
            checked={s.shuffleQuestions}
            onChange={(e) => setSetting('shuffleQuestions', e.target.checked)}
          />
          <Checkbox
            label="Shuffle options"
            checked={s.shuffleOptions}
            onChange={(e) => setSetting('shuffleOptions', e.target.checked)}
          />
          <div className="md:col-span-2">
            <Checkbox
              label="Show participants their live score and rank"
              checked={s.liveScoreVisible}
              onChange={(e) => setSetting('liveScoreVisible', e.target.checked)}
            />
            {s.liveScoreVisible && s.feedbackMode !== 'immediate' && (
              <Alert tone="warning" className="mt-2">
                Participants can change an answer and watch whether their live score goes up, so they can find the
                correct option by trial and error before submitting. Turn off the live score for a graded quiz.
              </Alert>
            )}
          </div>
          <Checkbox
            className="md:col-span-2"
            label="Show the leaderboard to participants"
            description="Participants see rank, name and score only (never URNs, mobiles or sections)."
            checked={s.leaderboardVisibleToParticipants}
            onChange={(e) => setSetting('leaderboardVisibleToParticipants', e.target.checked)}
          />
        </div>
        <Button type="submit" loading={busy}>
          Save settings
        </Button>
      </fieldset>
    </form>
  );
}
