import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FieldsEditor } from '../FieldsEditor';
import { StyleField } from '../../types';

afterEach(cleanup);

function setup(fields: StyleField[], prompt = '') {
  const onChange = vi.fn();
  const utils = render(<FieldsEditor fields={fields} onChange={onChange} prompt={prompt} />);
  return { onChange, ...utils };
}

const teamField: StyleField = { key: 'team', label: 'Team', type: 'text', required: true };

describe('FieldsEditor', () => {
  it('shows an empty-state hint when there are no fields', () => {
    setup([]);
    expect(screen.getByText(/Classic styles need none/i)).toBeTruthy();
  });

  it('adds a field, suggesting the key from an unbacked prompt placeholder', () => {
    const { onChange } = setup([], 'Wearing a {{team}} jersey.');
    fireEvent.click(screen.getByText(/Add Field/i));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as StyleField[];
    expect(next[0].key).toBe('team');
    expect(next[0].required).toBe(true);
  });

  it('warns when the prompt references a placeholder with no field', () => {
    setup([], 'A {{country}} flag.');
    expect(screen.getByText(/no matching field/i)).toBeTruthy();
  });

  it('warns about duplicate field keys', () => {
    setup([teamField, { ...teamField, label: 'Team 2' }], '{{team}}');
    expect(screen.getByText(/Duplicate field keys/i)).toBeTruthy();
  });

  it('flags an invalid (non snake_case) key', () => {
    setup([{ key: 'Team Name', label: 'X', type: 'text', required: false }], '');
    expect(screen.getByText(/lower_snake_case/i)).toBeTruthy();
  });

  it('edits a field label through onChange', () => {
    const { onChange } = setup([teamField], '{{team}}');
    const labelInput = screen.getByDisplayValue('Team');
    fireEvent.change(labelInput, { target: { value: 'Club' } });
    const next = onChange.mock.calls.at(-1)![0] as StyleField[];
    expect(next[0].label).toBe('Club');
  });

  it('deletes a field', () => {
    const { onChange } = setup([teamField], '{{team}}');
    fireEvent.click(screen.getByTitle('Delete'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('reorders fields with move down', () => {
    const a: StyleField = { key: 'a', label: 'A', type: 'text', required: false };
    const b: StyleField = { key: 'b', label: 'B', type: 'text', required: false };
    const { onChange } = setup([a, b], '{{a}} {{b}}');
    fireEvent.click(screen.getAllByTitle('Move down')[0]);
    const next = onChange.mock.calls.at(-1)![0] as StyleField[];
    expect(next.map((f) => f.key)).toEqual(['b', 'a']);
  });

  it('renders a form preview reflecting the fields', () => {
    setup([teamField], '{{team}}');
    expect(screen.getByText(/Form preview/i)).toBeTruthy();
  });
});
