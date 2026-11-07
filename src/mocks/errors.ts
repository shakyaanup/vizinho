/**
 * A broken business rule (e.g. "this application is in review"). `code` is a
 * translation key, so the UI shows a localized message, never internal text.
 * Mirrors the SQLSTATE errors the original database functions raised.
 */
export class DomainError<Code extends string = string> extends Error {
  constructor(readonly code: Code) {
    super(code);
    this.name = "DomainError";
  }
}

export const nextId = (rows: readonly { id: number }[]) =>
  rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
