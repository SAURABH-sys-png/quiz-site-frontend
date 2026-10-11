import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  FullPageSpinner,
  Input,
  Modal,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { formatDateTime, fromLocalInput, toLocalInput } from '../../../lib/time.js';

function keyStatus(k) {
  const now = Date.now();
  if (!k.isActive) return <Badge tone="red">Inactive</Badge>;
  if (Date.parse(k.validUntil) < now) return <Badge>Expired</Badge>;
  if (Date.parse(k.validFrom) > now) return <Badge tone="sky">Scheduled</Badge>;
  return <Badge tone="green">● Valid now</Badge>;
}

function isValidNow(k, now = Date.now()) {
  return k.isActive && Date.parse(k.validFrom) <= now && Date.parse(k.validUntil) >= now;
}

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 0, 0);
  return { validFrom: toLocalInput(start), validUntil: toLocalInput(end) };
}

function RevealKey({ revealed, onClose }) {
  return (
    <Modal
      open={Boolean(revealed)}
      title="Share this access key"
      onClose={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {revealed && (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Key for <strong>{revealed.label}</strong>. It is stored only as a hash and{' '}
            <strong>will not be shown again</strong>.
          </p>
          <p className="rounded-xl bg-slate-900 px-4 py-5 text-center font-mono text-3xl font-semibold tracking-[0.3em] text-white select-all">
            {revealed.key}
          </p>
          <p>
            Students sign in with password = their URN followed by this key, e.g.{' '}
            <code className="font-mono">E25B002749{revealed.key}</code>. The key is case-sensitive.
          </p>
        </div>
      )}
    </Modal>
  );
}

export function AccessKeysPage() {
  const queryClient = useQueryClient();
  const keys = useQuery({
    queryKey: ['admin', 'access-keys'],
    queryFn: () => api('/admin/access-keys').then((r) => r.accessKeys),
  });
  const [form, setForm] = useState(() => ({ label: '', key: '', ...defaultWindow() }));
  const [revealed, setRevealed] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'access-keys'] });

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        label: form.label,
        validFrom: fromLocalInput(form.validFrom),
        validUntil: fromLocalInput(form.validUntil),
      };
      if (form.key.trim()) body.key = form.key.trim();
      const res = await api('/admin/access-keys', { method: 'POST', body });
      setRevealed({ label: res.accessKey.label, key: res.key });
      setForm({ label: '', key: '', ...defaultWindow() });
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function act(k, action) {
    setError(null);
    try {
      if (action === 'rotate') {
        const res = await api(`/admin/access-keys/${k.id}/rotate`, { method: 'POST', body: {} });
        setRevealed({ label: res.accessKey.label, key: res.key });
      } else {
        await api(`/admin/access-keys/${k.id}/deactivate`, { method: 'POST' });
      }
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Access keys"
        subtitle="The key of the day. Participants sign in with password = URN + key while a key is valid."
      />
      {keys.data && !keys.data.some((k) => isValidNow(k)) && (
        <Alert tone="warning" className="mb-4" title="No access key is valid right now">
          Every participant login will fail with &quot;Invalid credentials&quot; until you create a key whose validity
          window includes the current time.
        </Alert>
      )}
      {error && (
        <Alert className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card className="mb-6 p-4">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_10rem_auto] md:items-end">
          <Field label="Label">
            {(id) => (
              <Input
                id={id}
                placeholder="Day 1 - Morning"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            )}
          </Field>
          <Field label="Valid from">
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                required
              />
            )}
          </Field>
          <Field label="Valid until">
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                required
              />
            )}
          </Field>
          <Field label="Key (optional)" hint="Blank = random">
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                placeholder="auto"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                pattern="[A-Za-z0-9]{4,32}"
              />
            )}
          </Field>
          <Button type="submit" loading={busy} className="md:mb-5">
            Create key
          </Button>
        </form>
      </Card>

      {keys.isPending ? (
        <FullPageSpinner />
      ) : keys.error ? (
        <Alert>{errorMessage(keys.error)}</Alert>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <Th>Label</Th>
              <Th>Status</Th>
              <Th>Valid from</Th>
              <Th>Valid until</Th>
              <Th>Created by</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keys.data.map((k) => (
              <tr key={k.id}>
                <Td className="font-medium">{k.label}</Td>
                <Td>{keyStatus(k)}</Td>
                <Td className="text-xs whitespace-nowrap">{formatDateTime(k.validFrom)}</Td>
                <Td className="text-xs whitespace-nowrap">{formatDateTime(k.validUntil)}</Td>
                <Td className="text-xs">{k.createdBy}</Td>
                <Td className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => act(k, 'rotate')}>
                    Rotate
                  </Button>
                  {k.isActive && (
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => act(k, 'deactivate')}>
                      Deactivate
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
            {keys.data.length === 0 && (
              <tr>
                <Td colSpan={6} className="py-8 text-center text-slate-500">
                  No keys yet. Create one before participants sign in.
                </Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}
      <RevealKey revealed={revealed} onClose={() => setRevealed(null)} />
    </>
  );
}
