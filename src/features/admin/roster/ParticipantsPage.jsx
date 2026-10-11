import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  FullPageSpinner,
  Input,
  Modal,
  PageHeader,
  Select,
  TableWrap,
  Td,
  Th,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { formatDateTime } from '../../../lib/time.js';
import { DownloadButton, ImportPanel } from '../common.jsx';

const PAGE_SIZE = 50;

function EditParticipantModal({ participant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: participant.name,
    mobile: participant.mobile,
    section: participant.section ?? '',
    isActive: participant.isActive,
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/participants/${participant.id}`, { method: 'PATCH', body: form });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Edit ${participant.urn}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Name">
          {(id) => (
            <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
        </Field>
        <Field label="Mobile">
          {(id) => (
            <Input
              id={id}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              required
            />
          )}
        </Field>
        <Field label="Section">
          {(id) => (
            <Input id={id} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          )}
        </Field>
        <Checkbox
          label="Active"
          description="Inactive participants cannot sign in."
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ParticipantsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', section: '', status: 'all', page: 1 });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  const list = useQuery({
    queryKey: ['admin', 'participants', filters],
    queryFn: () => api('/admin/participants', { query: { ...filters, limit: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });
  const sections = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => api('/admin/participants/sections').then((r) => r.sections),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'participants'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] });
  };
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  async function endSession(p) {
    try {
      await api(`/admin/participants/${p.id}/end-session`, { method: 'POST' });
      setMessage({ tone: 'success', text: `Signed ${p.urn} out of all devices.` });
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    }
  }

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Participants"
        subtitle="Students are added automatically the first time they sign in, or by importing a roster. Re-importing updates people by URN and never deletes anyone."
      />

      <Card className="mb-5 p-4">
        <h2 className="mb-2 font-semibold text-slate-800">Import roster</h2>
        <ImportPanel
          endpoint="/admin/participants/import"
          accept=".csv,.xlsx"
          onImported={refresh}
          help={
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>Columns: URN, Name, Mobile, Section (.xlsx or .csv).</span>
              <DownloadButton path="/admin/templates/roster.xlsx">Roster template</DownloadButton>
            </div>
          }
          renderPreview={(p) =>
            p.preview.length > 0 && (
              <div className="max-h-64 overflow-auto">
                <TableWrap>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Row</Th>
                      <Th>URN</Th>
                      <Th>Name</Th>
                      <Th>Mobile</Th>
                      <Th>Section</Th>
                      <Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {p.preview.map((r) => (
                      <tr key={r.urn}>
                        <Td className="font-mono">{r.rowNumber}</Td>
                        <Td className="font-mono">{r.urn}</Td>
                        <Td>{r.name}</Td>
                        <Td className="font-mono">{r.mobile}</Td>
                        <Td>{r.section}</Td>
                        <Td>
                          {r.action === 'create' ? <Badge tone="sky">New</Badge> : <Badge tone="amber">Update</Badge>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            )
          }
        />
      </Card>

      {message && (
        <Alert tone={message.tone} className="mb-4" onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_10rem_10rem]">
        <Input
          placeholder="Search URN, name or mobile"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          aria-label="Search"
        />
        <Select value={filters.section} onChange={(e) => setFilter('section', e.target.value)} aria-label="Section">
          <option value="">All sections</option>
          {sections.data?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {list.isPending ? (
        <FullPageSpinner />
      ) : list.error ? (
        <Alert>{errorMessage(list.error)}</Alert>
      ) : (
        <>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                <Th>URN</Th>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>Section</Th>
                <Th>Status</Th>
                <Th>Last sign-in</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.data.items.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono">{p.urn}</Td>
                  <Td>{p.name}</Td>
                  <Td className="font-mono">{p.mobile}</Td>
                  <Td>{p.section || '—'}</Td>
                  <Td>{p.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</Td>
                  <Td className="text-xs whitespace-nowrap">{formatDateTime(p.lastLoginAt)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => endSession(p)}>
                      Sign out
                    </Button>
                  </Td>
                </tr>
              ))}
              {list.data.items.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-slate-500">
                    No participants match.
                  </Td>
                </tr>
              )}
            </tbody>
          </TableWrap>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>{total} participant(s)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Previous
              </Button>
              <span>
                Page {filters.page} / {pages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={filters.page >= pages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <EditParticipantModal
          participant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
