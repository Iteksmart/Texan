'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { importSpreadsheetAction } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? 'Importing… this can take a minute' : 'Import workbook'}
    </button>
  );
}

export function ImportForm() {
  const [state, formAction] = useFormState(importSpreadsheetAction, undefined);
  return (
    <form action={formAction}>
      {state?.error ? <div className="error-box">{state.error}</div> : null}
      {state?.ok ? <div className="ok-box">{state.ok}</div> : null}
      <label className="field" style={{ maxWidth: 420 }}>
        Workbook file (.xlsx)
        <input name="file" type="file" accept=".xlsx,.xls" required />
      </label>
      <div style={{ marginTop: 12 }}>
        <SubmitButton />
      </div>
    </form>
  );
}
