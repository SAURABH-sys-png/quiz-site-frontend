import { useState } from 'react';
import { Alert, Badge, Button, Td, Th, TableWrap } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { downloadFile } from '../../lib/download.js';

export function TestStatusBadge({ status }) {
  const tone = { draft: 'slate', published: 'sky', live: 'green', ended: 'indigo' }[status];
  const label = { draft: 'Draft', published: 'Published', live: '● Live', ended: 'Ended' }[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function DownloadButton({ path, query, children, variant = 'secondary', size = 'sm' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  return (
    <span className="inline-flex flex-col">
      <Button
        variant={variant}
        size={size}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await downloadFile(path, { query });
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
      </Button>
      {error && <span className="mt-1 text-xs text-rose-600">{error}</span>}
    </span>
  );
}

/**
 * Upload -> preview with row-level errors -> confirm. Nothing is saved until the admin confirms.
 * The same file is re-sent with mode=commit and re-validated by the server.
 */
export function ImportPanel({ endpoint, accept, onImported, renderPreview, help }) {
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function send(mode) {
    const form = new FormData();
    form.append('file', file);
    return api(endpoint, { method: 'POST', form, query: { mode } });
  }

  async function run(mode) {
    setBusy(mode);
    setError(null);
    try {
      const result = await send(mode);
      if (mode === 'preview') {
        setPreview(result);
        setDone(null);
      } else {
        setDone(result);
        setPreview(null);
        setFile(null);
        setInputKey((k) => k + 1);
        onImported?.(result);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setPreview(null);
    setFile(null);
    setInputKey((k) => k + 1);
  }

  return (
    <div className="space-y-3">
      {help}
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={inputKey}
          type="file"
          accept={accept}
          className="block max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setDone(null);
          }}
        />
        <Button size="sm" onClick={() => run('preview')} disabled={!file} loading={busy === 'preview'}>
          Preview
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {done && (
        <Alert tone="success" onClose={() => setDone(null)}>
          Imported {done.imported ?? done.validRows} row(s).
          {done.invalidRows > 0 && ` ${done.invalidRows} invalid row(s) were skipped.`}
        </Alert>
      )}
      {preview && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>{preview.totalRows} rows</Badge>
            <Badge tone="green">{preview.validRows} valid</Badge>
            {preview.invalidRows > 0 && <Badge tone="red">{preview.invalidRows} invalid</Badge>}
            {preview.toCreate != null && <Badge tone="sky">{preview.toCreate} new</Badge>}
            {preview.toUpdate != null && <Badge tone="amber">{preview.toUpdate} updated</Badge>}
          </div>
          {preview.errors.length > 0 && (
            <div className="max-h-60 overflow-auto">
              <TableWrap>
                <thead className="bg-rose-50">
                  <tr>
                    <Th>Row</Th>
                    <Th>Field</Th>
                    <Th>Problem</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.errors.map((e, i) => (
                    <tr key={i}>
                      <Td className="font-mono">{e.row}</Td>
                      <Td className="font-mono">{e.field ?? e.path ?? ''}</Td>
                      <Td>{e.message}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          )}
          {renderPreview?.(preview)}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run('commit')} disabled={preview.validRows === 0} loading={busy === 'commit'}>
              Import {preview.validRows} valid row(s)
              {preview.invalidRows > 0 ? `, skip ${preview.invalidRows}` : ''}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
