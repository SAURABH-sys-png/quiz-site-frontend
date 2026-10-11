import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { LazyCodeEditor } from '../../../components/LazyCodeEditor.jsx';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  cx,
  Field,
  FullPageSpinner,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { LANGUAGE_LABELS, TYPE_LABELS } from '../../attempt/answers.js';
import { QuestionView } from '../../attempt/QuestionView.jsx';

const BLANK_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,19})\s*\}\}/g;
const blankIdsIn = (statement) => [...new Set([...String(statement).matchAll(BLANK_RE)].map((m) => m[1]))];
const LETTERS = 'ABCDEFGHIJ';

const defaultOptions = () => ['A', 'B', 'C', 'D'].map((id) => ({ id, text: '' }));

function emptyForm(type = 'mcq') {
  return {
    type,
    statement: '',
    marks: 1,
    negativeMarks: 0,
    explanation: '',
    options: defaultOptions(),
    correctOptionIds: [],
    multiSelect: false,
    blankConfig: {},
    language: 'python',
    code: '',
    grading: 'answer',
    acceptedFixes: [''],
    testCases: [{ input: '', expectedOutput: '', hidden: false, weight: 1 }],
    fixedCode: '',
    allOrNothing: false,
    answerMode: 'text',
    expectedOutput: '',
  };
}

/** Stored question -> editable form. */
function toForm(q) {
  const form = { ...emptyForm(q.type), ...q };
  form.options = q.options?.length ? q.options.map((o) => ({ id: o.id, text: o.text })) : defaultOptions();
  form.correctOptionIds = q.correctOptionIds ?? [];
  form.acceptedFixes = q.acceptedFixes?.length ? q.acceptedFixes : [''];
  form.testCases = q.testCases?.length
    ? q.testCases.map(({ input, expectedOutput, hidden, weight }) => ({ input, expectedOutput, hidden, weight }))
    : emptyForm().testCases;
  form.blankConfig = Object.fromEntries(
    (q.blanks ?? []).map((b) => [b.id, { answers: b.acceptedAnswers.join('\n'), caseSensitive: b.caseSensitive }]),
  );
  return form;
}

const lines = (text) =>
  String(text ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

/** Editable form -> API payload (only the fields this type uses). */
function toPayload(form) {
  const base = {
    type: form.type,
    statement: form.statement,
    marks: Number(form.marks),
    negativeMarks: Number(form.negativeMarks) || 0,
    explanation: form.explanation,
  };
  const options = form.options.map((o) => ({ id: o.id, text: o.text }));
  switch (form.type) {
    case 'mcq':
      return { ...base, options, correctOptionIds: form.correctOptionIds, multiSelect: form.multiSelect };
    case 'fill_blank':
      return {
        ...base,
        blanks: blankIdsIn(form.statement).map((id) => ({
          id,
          acceptedAnswers: lines(form.blankConfig[id]?.answers),
          caseSensitive: Boolean(form.blankConfig[id]?.caseSensitive),
        })),
      };
    case 'debug':
      return form.grading === 'run'
        ? {
            ...base,
            language: form.language,
            code: form.code,
            grading: 'run',
            testCases: form.testCases.map((tc) => ({ ...tc, weight: Number(tc.weight) || 1 })),
            fixedCode: form.fixedCode,
            allOrNothing: form.allOrNothing,
          }
        : {
            ...base,
            language: form.language,
            code: form.code,
            grading: 'answer',
            acceptedFixes: form.acceptedFixes.filter((f) => f.trim()),
          };
    case 'snippet':
      return form.answerMode === 'mcq'
        ? {
            ...base,
            language: form.language,
            code: form.code,
            answerMode: 'mcq',
            options,
            correctOptionIds: form.correctOptionIds.slice(0, 1),
          }
        : {
            ...base,
            language: form.language,
            code: form.code,
            answerMode: 'text',
            expectedOutput: form.expectedOutput,
          };
    default:
      return base;
  }
}

/** Participant-shaped preview (no solutions), rendered with the real participant component. */
function toPreview(form) {
  const p = {
    id: 'preview',
    type: form.type,
    statement: form.statement || '_Statement preview_',
    marks: Number(form.marks) || 0,
    negativeMarks: Number(form.negativeMarks) || 0,
  };
  if (form.type === 'mcq') Object.assign(p, { options: form.options, multiSelect: form.multiSelect });
  if (form.type === 'fill_blank') p.blanks = blankIdsIn(form.statement).map((id) => ({ id }));
  if (form.type === 'debug') {
    Object.assign(p, { language: form.language, code: form.code || ' ', grading: form.grading });
    if (form.grading === 'run') p.sampleTestCases = form.testCases.filter((tc) => !tc.hidden);
  }
  if (form.type === 'snippet')
    Object.assign(p, {
      language: form.language,
      code: form.code || ' ',
      answerMode: form.answerMode,
      options: form.options,
    });
  return p;
}

function OptionsEditor({ form, update, single }) {
  const setOption = (i, text) => update({ options: form.options.map((o, j) => (j === i ? { ...o, text } : o)) });
  const toggleCorrect = (id) => {
    if (single) return update({ correctOptionIds: [id] });
    const has = form.correctOptionIds.includes(id);
    update({ correctOptionIds: has ? form.correctOptionIds.filter((c) => c !== id) : [...form.correctOptionIds, id] });
  };
  const add = () => {
    const id = [...LETTERS].find((l) => !form.options.some((o) => o.id === l));
    if (id) update({ options: [...form.options, { id, text: '' }] });
  };
  const remove = (id) =>
    update({
      options: form.options.filter((o) => o.id !== id),
      correctOptionIds: form.correctOptionIds.filter((c) => c !== id),
    });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Options (mark the correct {single ? 'one' : 'ones'})</p>
      {form.options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input
            type={single ? 'radio' : 'checkbox'}
            name="correct"
            className="size-4 shrink-0 accent-emerald-600"
            checked={form.correctOptionIds.includes(o.id)}
            onChange={() => toggleCorrect(o.id)}
            aria-label={`Option ${o.id} is correct`}
          />
          <span className="w-5 font-mono text-sm text-slate-500">{o.id}</span>
          <Input value={o.text} onChange={(e) => setOption(i, e.target.value)} placeholder="Option text (Markdown)" />
          <Button
            size="sm"
            variant="ghost"
            disabled={form.options.length <= 2}
            onClick={() => remove(o.id)}
            aria-label={`Remove option ${o.id}`}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={add} disabled={form.options.length >= LETTERS.length}>
        + Option
      </Button>
    </div>
  );
}

function TypeFields({ form, update }) {
  const languageSelect = (
    <Field label="Language">
      {(id) => (
        <Select id={id} value={form.language} onChange={(e) => update({ language: e.target.value })}>
          {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  switch (form.type) {
    case 'mcq':
      return (
        <div className="space-y-3">
          <Checkbox
            label="Multiple correct answers"
            description="Participants must select exactly the correct set."
            checked={form.multiSelect}
            onChange={(e) =>
              update({
                multiSelect: e.target.checked,
                correctOptionIds: e.target.checked ? form.correctOptionIds : form.correctOptionIds.slice(0, 1),
              })
            }
          />
          <OptionsEditor form={form} update={update} single={!form.multiSelect} />
        </div>
      );
    case 'fill_blank': {
      const ids = blankIdsIn(form.statement);
      const setBlank = (id, patch) =>
        update({ blankConfig: { ...form.blankConfig, [id]: { ...form.blankConfig[id], ...patch } } });
      return (
        <div className="space-y-3">
          <Alert tone="info">
            Put blanks in the statement as <code className="font-mono">{'{{b1}}'}</code>,{' '}
            <code className="font-mono">{'{{b2}}'}</code>… Marks are split equally across blanks.
          </Alert>
          {ids.length === 0 && <p className="text-sm text-slate-500">No blanks found in the statement yet.</p>}
          {ids.map((id, i) => (
            <div key={id} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_auto]">
              <Field label={`Blank ${i + 1} (${id}): accepted answers, one per line`}>
                {(fid) => (
                  <Textarea
                    id={fid}
                    rows={2}
                    value={form.blankConfig[id]?.answers ?? ''}
                    onChange={(e) => setBlank(id, { answers: e.target.value })}
                  />
                )}
              </Field>
              <Checkbox
                label="Case-sensitive"
                checked={Boolean(form.blankConfig[id]?.caseSensitive)}
                onChange={(e) => setBlank(id, { caseSensitive: e.target.checked })}
              />
            </div>
          ))}
        </div>
      );
    }
    case 'debug':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {languageSelect}
            <Field label="Grading">
              {(id) => (
                <Select id={id} value={form.grading} onChange={(e) => update({ grading: e.target.value })}>
                  <option value="answer">Match the corrected line(s)</option>
                  <option value="run">Run the fixed program against test cases</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Buggy code (shown to participants)">
            {() => (
              <LazyCodeEditor
                value={form.code}
                language={form.language}
                onChange={(code) => update({ code })}
                minHeight="140px"
              />
            )}
          </Field>
          {form.grading === 'answer' ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Accepted fixes (whitespace-insensitive match)</p>
              {form.acceptedFixes.map((fix, i) => (
                <div key={i} className="flex gap-2">
                  <Textarea
                    rows={2}
                    className="font-mono"
                    value={fix}
                    onChange={(e) =>
                      update({ acceptedFixes: form.acceptedFixes.map((f, j) => (j === i ? e.target.value : f)) })
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={form.acceptedFixes.length <= 1}
                    onClick={() => update({ acceptedFixes: form.acceptedFixes.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => update({ acceptedFixes: [...form.acceptedFixes, ''] })}
              >
                + Accepted fix
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Test cases</p>
              {form.testCases.map((tc, i) => {
                const setCase = (patch) =>
                  update({ testCases: form.testCases.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
                return (
                  <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label={`Case ${i + 1} input (stdin)`}>
                        {(id) => (
                          <Textarea
                            id={id}
                            rows={2}
                            className="font-mono"
                            value={tc.input}
                            onChange={(e) => setCase({ input: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field label="Expected output">
                        {(id) => (
                          <Textarea
                            id={id}
                            rows={2}
                            className="font-mono"
                            value={tc.expectedOutput}
                            onChange={(e) => setCase({ expectedOutput: e.target.value })}
                          />
                        )}
                      </Field>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <Checkbox
                        label="Hidden"
                        description="Never shown to participants"
                        checked={tc.hidden}
                        onChange={(e) => setCase({ hidden: e.target.checked })}
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        Weight
                        <Input
                          type="number"
                          min={0.1}
                          step={0.1}
                          className="w-20"
                          value={tc.weight}
                          onChange={(e) => setCase({ weight: e.target.value })}
                        />
                      </label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        disabled={form.testCases.length <= 1}
                        onClick={() => update({ testCases: form.testCases.filter((_, j) => j !== i) })}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  update({ testCases: [...form.testCases, { input: '', expectedOutput: '', hidden: true, weight: 1 }] })
                }
              >
                + Test case
              </Button>
              <Checkbox
                label="All or nothing"
                description="Full marks only if every test case passes"
                checked={form.allOrNothing}
                onChange={(e) => update({ allOrNothing: e.target.checked })}
              />
              <Field label="Reference solution (shown in feedback after the test)">
                {() => (
                  <LazyCodeEditor
                    value={form.fixedCode}
                    language={form.language}
                    onChange={(fixedCode) => update({ fixedCode })}
                    minHeight="120px"
                  />
                )}
              </Field>
            </div>
          )}
        </div>
      );
    case 'snippet':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {languageSelect}
            <Field label="Answer format">
              {(id) => (
                <Select id={id} value={form.answerMode} onChange={(e) => update({ answerMode: e.target.value })}>
                  <option value="text">Type the output</option>
                  <option value="mcq">Choose from options</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Code snippet">
            {() => (
              <LazyCodeEditor
                value={form.code}
                language={form.language}
                onChange={(code) => update({ code })}
                minHeight="140px"
              />
            )}
          </Field>
          {form.answerMode === 'mcq' ? (
            <OptionsEditor form={form} update={update} single />
          ) : (
            <Field
              label="Expected output"
              hint="Compared after trimming and normalizing line endings / trailing spaces."
            >
              {(id) => (
                <Textarea
                  id={id}
                  rows={3}
                  className="font-mono"
                  value={form.expectedOutput}
                  onChange={(e) => update({ expectedOutput: e.target.value })}
                />
              )}
            </Field>
          )}
        </div>
      );
    default:
      return null;
  }
}

function Editor({ testId, question, locked }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => (question ? toForm(question) : emptyForm()));
  const [previewResponse, setPreviewResponse] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = toPayload(form);
      if (question) await api(`/admin/tests/${testId}/questions/${question.id}`, { method: 'PUT', body });
      else await api(`/admin/tests/${testId}/questions`, { method: 'POST', body });
      queryClient.invalidateQueries({ queryKey: ['admin', 'test', testId] });
      navigate(`/admin/tests/${testId}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-5 xl:grid-cols-2">
      <Card className="min-w-0 space-y-4 p-5">
        {locked && <Alert tone="info">This test has started, so its questions are read-only.</Alert>}
        <fieldset disabled={locked} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type" className="sm:col-span-3">
              {(id) => (
                <div id={id} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        update({ type: value });
                        setPreviewResponse(null);
                      }}
                      className={cx(
                        'rounded-lg border px-2 py-2 text-sm font-medium',
                        form.type === value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Marks">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step={0.25}
                  value={form.marks}
                  onChange={(e) => update({ marks: e.target.value })}
                  required
                />
              )}
            </Field>
            <Field label="Negative marks" hint="Deducted when wrong">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step={0.25}
                  value={form.negativeMarks}
                  onChange={(e) => update({ negativeMarks: e.target.value })}
                />
              )}
            </Field>
          </div>
          <Field
            label="Statement"
            hint="Markdown. Math: $x^2$ inline, $$\int_0^1 x\,dx$$ block. Code: ```python fences."
          >
            {(id) => (
              <Textarea
                id={id}
                rows={6}
                className="font-mono"
                value={form.statement}
                onChange={(e) => update({ statement: e.target.value })}
                required
              />
            )}
          </Field>
          <TypeFields form={form} update={update} />
          <Field label="Explanation (shown with feedback)">
            {(id) => (
              <Textarea
                id={id}
                rows={3}
                value={form.explanation}
                onChange={(e) => update({ explanation: e.target.value })}
              />
            )}
          </Field>
        </fieldset>
        {error && (
          <Alert title="Could not save">
            {error.details?.length ? (
              <ul className="list-disc pl-5">
                {error.details.map((d, i) => (
                  <li key={i}>
                    {d.path && <code className="mr-1 font-mono text-xs">{d.path}</code>}
                    {d.message}
                  </li>
                ))}
              </ul>
            ) : (
              errorMessage(error)
            )}
          </Alert>
        )}
        <div className="flex gap-2">
          {!locked && (
            <Button type="submit" loading={busy}>
              {question ? 'Save changes' : 'Add question'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(`/admin/tests/${testId}`)}>
            {locked ? 'Back' : 'Cancel'}
          </Button>
        </div>
      </Card>

      <div className="min-w-0 space-y-2 xl:sticky xl:top-20 xl:self-start">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Participant preview</p>
        <Card className="p-5">
          <QuestionView
            question={toPreview(form)}
            number={1}
            response={previewResponse}
            onChange={setPreviewResponse}
          />
        </Card>
      </div>
    </form>
  );
}

export function QuestionEditorPage() {
  const { id: testId, qid } = useParams();
  const test = useQuery({
    queryKey: ['admin', 'test', testId],
    queryFn: () => api(`/admin/tests/${testId}`).then((r) => r.test),
  });
  const question = useQuery({
    queryKey: ['admin', 'test', testId, 'question', qid],
    queryFn: () => api(`/admin/tests/${testId}/questions/${qid}`).then((r) => r.question),
    enabled: Boolean(qid),
  });

  if (test.isPending || (qid && question.isPending)) return <FullPageSpinner />;
  if (test.error || question.error) return <Alert>{errorMessage(test.error ?? question.error)}</Alert>;
  const locked = test.data.status === 'live' || test.data.status === 'ended';

  return (
    <>
      <PageHeader title={qid ? 'Edit question' : 'New question'} subtitle={test.data.title}>
        <Link to={`/admin/tests/${testId}`} className="mb-1 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Back to test
        </Link>
      </PageHeader>
      <Editor key={qid ?? 'new'} testId={testId} question={qid ? question.data : null} locked={locked} />
    </>
  );
}
