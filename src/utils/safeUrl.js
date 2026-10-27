// A link typed by someone is opened only if it is a plain web address
// (https:// or http://) — never javascript:, data: or anything else.
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : undefined)
