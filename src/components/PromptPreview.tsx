import React, { useState } from 'react';
import { StyleField } from '../types';
import { apiService } from '../services/api';

interface Props {
  prompt: string;
  fields: StyleField[];
}

/**
 * Admin-only live prompt preview. The admin enters sample values for the
 * configured fields and the backend renders the final prompt with the SAME
 * engine used at generation time, so the preview is exact. The rendered prompt
 * is returned only to authenticated admins (the endpoint is admin-guarded) and
 * is never exposed publicly.
 */
export const PromptPreview: React.FC<Props> = ({ prompt, fields }) => {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setValue = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));

  const render = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Only send values for keys that were actually entered, so optional
      // fields left blank fall through to the server's defaults.
      const trimmed: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.key];
        if (v !== undefined && v !== '' && !(typeof v === 'string' && v.trim() === '')) trimmed[f.key] = v;
      }
      const res = await apiService.previewPrompt({ prompt, fields, values: trimmed });
      setResult(res.prompt);
    } catch (err: any) {
      setError(err.message || 'Failed to render preview.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prompt-preview" style={{ marginTop: 12, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ margin: 0 }}>Live Prompt Preview (admin only)</label>
        <button type="button" className="btn secondary" onClick={render} disabled={loading || !prompt.trim()}>
          <i className="fa-solid fa-wand-magic-sparkles"></i> {loading ? 'Rendering…' : 'Render Preview'}
        </button>
      </div>

      {fields.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {fields.map((f) => (
            <div key={f.key || Math.random()}>
              <label style={{ fontSize: 11 }}>
                {f.label || f.key}
                {f.required ? ' *' : ''}
              </label>
              {f.type === 'dropdown' ? (
                <select value={(values[f.key] as string) ?? ''} onChange={(e) => setValue(f.key, e.target.value)}>
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'checkbox' ? (
                <div className="checkbox-item">
                  <input type="checkbox" checked={values[f.key] === true} onChange={(e) => setValue(f.key, e.target.checked)} />
                  <span style={{ fontSize: 12 }}>{f.label || f.key}</span>
                </div>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'color' ? 'text' : 'text'}
                  placeholder={f.placeholder ?? `Sample ${f.label || f.key}`}
                  value={(values[f.key] as string) ?? ''}
                  onChange={(e) => setValue(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>No fields — preview shows the prompt as-is.</div>
      )}

      {error && <div className="modal-error" role="alert">{error}</div>}
      {result !== null && (
        <div>
          <label style={{ fontSize: 11 }}>Final prompt (as the AI provider will receive it)</label>
          <div
            data-testid="preview-result"
            style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: 10, fontSize: 13 }}
          >
            {result}
          </div>
        </div>
      )}
    </div>
  );
};
