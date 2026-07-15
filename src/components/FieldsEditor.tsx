import React, { useMemo } from 'react';
import { StyleField, StyleFieldType, StyleFieldOption } from '../types';

const FIELD_TYPES: StyleFieldType[] = ['text', 'textarea', 'number', 'dropdown', 'checkbox', 'color', 'date'];

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function extractPlaceholders(prompt: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE);
  while ((m = re.exec(prompt)) !== null) out.add(m[1]);
  return [...out];
}

function isValidKey(key: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(key);
}

interface Props {
  fields: StyleField[];
  onChange: (fields: StyleField[]) => void;
  prompt: string;
}

/**
 * Data-driven editor for a style's dynamic input fields: add / edit / reorder /
 * delete, mark required, set placeholders, configure dropdown options, and see
 * a live preview of the form the mobile app will render. Placeholders in the
 * prompt are cross-checked against the configured fields so mismatches are
 * surfaced before saving (the backend rejects them anyway).
 */
export const FieldsEditor: React.FC<Props> = ({ fields, onChange, prompt }) => {
  const placeholders = useMemo(() => extractPlaceholders(prompt), [prompt]);
  const fieldKeys = useMemo(() => fields.map((f) => f.key), [fields]);

  const unbackedPlaceholders = placeholders.filter((p) => !fieldKeys.includes(p));
  const unusedFields = fields.filter((f) => f.key && !placeholders.includes(f.key));
  const duplicateKeys = fieldKeys.filter((k, i) => k && fieldKeys.indexOf(k) !== i);

  const update = (index: number, patch: Partial<StyleField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    // Prefer a placeholder that has no field yet, so "add field" is one click
    // after the admin writes {{team}} in the prompt.
    const suggestedKey = unbackedPlaceholders[0] ?? '';
    onChange([
      ...fields,
      {
        key: suggestedKey,
        label: suggestedKey ? suggestedKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '',
        type: 'text',
        required: true,
        placeholder: '',
        options: [],
        config: {},
        sortOrder: fields.length,
      },
    ]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, sortOrder: i })));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((f, i) => ({ ...f, sortOrder: i })));
  };

  const setOptions = (index: number, raw: string) => {
    const options: StyleFieldOption[] = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, label] = line.split('|').map((s) => s.trim());
        return { value, label: label || value };
      });
    update(index, { options });
  };

  return (
    <div className="fields-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ margin: 0 }}>Input Fields (dynamic prompt placeholders)</label>
        <button type="button" className="btn secondary" onClick={addField}>
          <i className="fa-solid fa-plus"></i> Add Field
        </button>
      </div>

      {(unbackedPlaceholders.length > 0 || duplicateKeys.length > 0 || unusedFields.length > 0) && (
        <div className="fields-editor-hints" style={{ fontSize: 12, marginBottom: 10 }}>
          {unbackedPlaceholders.length > 0 && (
            <div style={{ color: '#EF4444' }}>
              ⚠ Prompt uses {'{{'}
              {unbackedPlaceholders.join('}}, {{')}
              {'}}'} with no matching field. Add a field for each.
            </div>
          )}
          {duplicateKeys.length > 0 && (
            <div style={{ color: '#EF4444' }}>⚠ Duplicate field keys: {[...new Set(duplicateKeys)].join(', ')}</div>
          )}
          {unusedFields.length > 0 && (
            <div style={{ color: '#F59E0B' }}>
              ⚠ Field(s) not referenced by the prompt: {unusedFields.map((f) => f.key).join(', ')}
            </div>
          )}
        </div>
      )}

      {fields.length === 0 && (
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          No fields. Classic styles need none — add {'{{placeholders}}'} to the prompt and a field for each.
        </div>
      )}

      {fields.map((field, index) => {
        const keyError = field.key && !isValidKey(field.key);
        return (
          <div key={index} className="field-row" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 140px' }}>
                <label style={{ fontSize: 11 }}>Key (placeholder)</label>
                <input
                  type="text"
                  value={field.key}
                  placeholder="team"
                  onChange={(e) => update(index, { key: e.target.value.trim() })}
                  style={keyError ? { borderColor: '#EF4444' } : undefined}
                />
                {keyError && <span style={{ color: '#EF4444', fontSize: 11 }}>lower_snake_case</span>}
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={{ fontSize: 11 }}>Label</label>
                <input type="text" value={field.label} placeholder="Team" onChange={(e) => update(index, { label: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 120px' }}>
                <label style={{ fontSize: 11 }}>Type</label>
                <select value={field.type} onChange={(e) => update(index, { type: e.target.value as StyleFieldType })}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="checkbox-item" style={{ flex: '0 0 auto', paddingBottom: 6 }}>
                <input
                  type="checkbox"
                  id={`field-req-${index}`}
                  checked={field.required}
                  onChange={(e) => update(index, { required: e.target.checked })}
                />
                <label htmlFor={`field-req-${index}`} style={{ fontSize: 12 }}>
                  Required
                </label>
              </div>
              <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
                <button type="button" className="btn secondary" title="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                  <i className="fa-solid fa-arrow-up"></i>
                </button>
                <button type="button" className="btn secondary" title="Move down" onClick={() => move(index, 1)} disabled={index === fields.length - 1}>
                  <i className="fa-solid fa-arrow-down"></i>
                </button>
                <button type="button" className="btn danger" title="Delete" onClick={() => removeField(index)}>
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>

            {field.type !== 'checkbox' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11 }}>Placeholder / hint</label>
                <input type="text" value={field.placeholder ?? ''} placeholder="e.g. Barcelona" onChange={(e) => update(index, { placeholder: e.target.value })} />
              </div>
            )}

            {field.type === 'dropdown' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11 }}>Options (one per line, "value | label" or just "value")</label>
                <textarea
                  rows={3}
                  value={(field.options ?? []).map((o) => (o.label && o.label !== o.value ? `${o.value} | ${o.label}` : o.value)).join('\n')}
                  onChange={(e) => setOptions(index, e.target.value)}
                  placeholder={'S | Small\nM | Medium\nL | Large'}
                />
              </div>
            )}
          </div>
        );
      })}

      {fields.length > 0 && (
        <div className="form-preview" style={{ marginTop: 12, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Form preview (what the app will show)</div>
          <FormPreview fields={fields} />
        </div>
      )}
    </div>
  );
};

/** Renders a non-interactive preview of the generated form. */
const FormPreview: React.FC<{ fields: StyleField[] }> = ({ fields }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {fields.map((f, i) => (
      <div key={i}>
        <label style={{ fontSize: 12 }}>
          {f.label || f.key}
          {f.required ? ' *' : ''}
        </label>
        {f.type === 'textarea' ? (
          <textarea rows={2} disabled placeholder={f.placeholder ?? ''} />
        ) : f.type === 'dropdown' ? (
          <select disabled>
            <option>{(f.options ?? [])[0]?.label ?? '—'}</option>
          </select>
        ) : f.type === 'checkbox' ? (
          <div className="checkbox-item">
            <input type="checkbox" disabled /> <span style={{ fontSize: 12 }}>{f.label || f.key}</span>
          </div>
        ) : (
          <input
            type={f.type === 'number' ? 'number' : f.type === 'color' ? 'color' : f.type === 'date' ? 'date' : 'text'}
            disabled
            placeholder={f.placeholder ?? ''}
          />
        )}
      </div>
    ))}
  </div>
);
