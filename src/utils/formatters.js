export const fmt = (value) => value ? new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
export const arrayAt = (object, ...keys) => keys.map((key) => object?.[key]).find(Array.isArray) || [];
export const identifier = (report) => pick(report.reporteId, report.incidenteId, report.id, report.incidentId, report.incidenceId, '—');
export const date = value => value ? new Date(value).toLocaleString('es-PE') : 'Sin medición';
