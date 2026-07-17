import type { DashboardSelection } from './selection';

/**
 * Caller-owned query field names. Phase 1 deliberately does not choose final
 * production parameters; a fixture or future Phase 2 adapter supplies them.
 */
export type DashboardUrlFieldMap = Partial<
  Record<keyof DashboardSelection, string>
>;

export type DashboardUrlStateAdapter = {
  read(searchParams: URLSearchParams): Partial<DashboardSelection>;
  write(
    selection: DashboardSelection,
    current?: URLSearchParams,
  ): URLSearchParams;
};

/**
 * Creates a narrow string-ID adapter. Decoding is intentionally structural;
 * callers reconcile decoded IDs against their actual available values before
 * displaying them.
 */
export function createDashboardUrlStateAdapter(
  fields: DashboardUrlFieldMap,
): DashboardUrlStateAdapter {
  const mappedFields = Object.entries(fields) as Array<
    [keyof DashboardSelection, string]
  >;
  const parameterNames = mappedFields.map(([, parameter]) => parameter);

  if (new Set(parameterNames).size !== parameterNames.length) {
    throw new Error('Dashboard URL adapter parameter names must be unique');
  }

  return {
    read(searchParams) {
      const result: Partial<DashboardSelection> = {};
      for (const [field, parameter] of mappedFields) {
        const value = searchParams.get(parameter);
        if (value !== null && value.trim() !== '') {
          result[field] = value;
        }
      }
      return result;
    },
    write(selection, current = new URLSearchParams()) {
      const next = new URLSearchParams(current);
      for (const [field, parameter] of mappedFields) {
        const value = selection[field];
        if (value === null) {
          next.delete(parameter);
        } else {
          next.set(parameter, value);
        }
      }
      return next;
    },
  };
}
