/* The one field (round 5 v3), app-wide (window.DSField). Every field in the app is drawn by this: the Live drive chart's perspective view, made quiet.
   Short (62 px deep, from your v3 note), flat turf, a white line every 10 yards (the 50 brighter), no hash marks and no yardage numbers, end zones flat
   in each team's own primary with nothing written in them, the line of scrimmage in broadcast blue and the line to gain in broadcast
   yellow, the ball a plain white dot on the line. It sits on a flat dark plate, like the drive chart.
   DSField.svg({ a, h, los, fd, ball, notes, span, dims }) · los/fd in yards from the away (left) goal line, 0–100.
   notes: { los: 'Line of scrimmage', fd: 'First down' } labels set above the far sideline, never on the turf. */
(function () {
'use strict';
const TURF = '#22492f', LOS = '#4aa3ff', FD = '#ffd60a';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* the ball is a plain white dot on the line, as in ESPN Gamecast and Apple Sports: no football drawing */
const BALL = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`;
const prim = t => (t && ((window.App && App.teamRoles && (App.teamRoles(t) || {}).primary) || t.color)) || '#5d6573';

function svg(o = {}) {
  const W = 360, top = o.notes || o.span ? 40 : 14, H = top + (o.h0 || 62) + 14, BOT = top + (o.h0 || 62), INSET = 30;
  const pt = (u, d) => { const f = (u + 10) / 120, xl = INSET * (1 - d), xr = W - INSET * (1 - d); return [xl + (xr - xl) * f, top + (BOT - top) * d]; };
  const P = (u, d) => pt(u, d).map(v => v.toFixed(1)).join(' ');
  const quad = (u0, u1, fill) => `<path d="M${P(u0, 0)}L${P(u1, 0)}L${P(u1, 1)}L${P(u0, 1)}Z" fill="${fill}"/>`;
  const line = (u, stroke, w, d0 = 0, d1 = 1) => `<path d="M${P(u, d0)}L${P(u, d1)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="butt"/>`;
  let s = '';
  // end zones and turf
  s += quad(-10, 0, prim(o.a)) + quad(100, 110, prim(o.h)) + quad(0, 100, TURF);
  // yard lines every 10, the 50 brighter
  for (let u = 10; u < 100; u += 10) s += line(u, `rgba(255,255,255,${u === 50 ? .42 : .2})`, 1);
  s += line(0, 'rgba(255,255,255,.85)', 1.6) + line(100, 'rgba(255,255,255,.85)', 1.6);
  // the outline: sidelines and end lines
  s += `<path d="M${P(-10, 0)}L${P(110, 0)}L${P(110, 1)}L${P(-10, 1)}Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.1"/>`;
  // the line to gain, then the line of scrimmage over it, then the ball on the line
  if (o.fd != null) s += line(o.fd, FD, 2);
  if (o.los != null) s += line(o.los, LOS, 2);
  if (o.los != null && o.ball !== false) { const [x, y] = pt(o.los, .5); s += BALL(x, y); }
  // notes above the far sideline: a short tick in the line's colour, the words in white Sans
  const note = (u, c, t, right) => { const [x, y] = pt(u, 0); return `<path d="M${x.toFixed(1)} ${(y - 2).toFixed(1)}V${(y - 12).toFixed(1)}" stroke="${c}" stroke-width="2"/><text x="${(x + (right ? 6 : -6)).toFixed(1)}" y="${(y - 15).toFixed(1)}" fill="#fff" font-size="10.5" font-family="AP Sans" font-weight="700" text-anchor="${right ? 'start' : 'end'}">${esc(t)}</text>`; };
  if (o.notes && o.notes.los && o.los != null) s += note(o.los, LOS, o.notes.los, false);
  if (o.notes && o.notes.fd && o.fd != null) s += note(o.fd, FD, o.notes.fd, true);
  // a measured span above the field (the basics lesson: goal line to goal line)
  if (o.span) { const [x0, y0] = pt(o.span[0], 0), [x1] = pt(o.span[1], 0), y = y0 - 14, mid = (x0 + x1) / 2, gap = o.span[2].length * 3.1 + 10;
    s += `<path d="M${x0.toFixed(1)} ${(y - 4).toFixed(1)}v8M${x1.toFixed(1)} ${(y - 4).toFixed(1)}v8M${x0.toFixed(1)} ${y.toFixed(1)}H${(mid - gap).toFixed(1)}M${(mid + gap).toFixed(1)} ${y.toFixed(1)}H${x1.toFixed(1)}" stroke="rgba(255,255,255,.55)" stroke-width="1"/><text x="${mid.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" fill="#fff" font-size="10.5" font-family="AP Sans" font-weight="700" text-anchor="middle">${esc(o.span[2])}</text>`; }
  return `<svg class="dsf-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.label || 'Field')}">${s}</svg>`;
}
/** the field on its plate, with an optional caption under it (Sans, white at 72%) */
const plate = (o = {}, cap = '') => `<div class="dsf">${svg(o)}${cap ? `<div class="dsf-cap">${cap}</div>` : ''}</div>`;
window.DSField = { svg, plate, LOS, FD };
})();
