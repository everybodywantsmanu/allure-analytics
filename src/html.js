// Escape any value that may come from user input or an API before it is
// interpolated into markup. Dictionary strings are trusted and may carry <em>.

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => MAP[c]);
