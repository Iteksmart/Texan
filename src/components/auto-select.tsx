'use client';

// A <select> that submits its parent form on change — used for inline
// checklist/treatment status editing without a save button per row.
export function AutoSelect({
  name,
  defaultValue,
  options,
  disabled,
}: {
  name: string;
  defaultValue: string;
  options: readonly string[];
  disabled?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--baseline)', background: 'var(--surface-1)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 12.5 }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
