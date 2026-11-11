/* Approvals round 14: game hero colours (official primaries) and the docked-video mini hero's status in the middle.
   Cards keyed by id in window.R5_CARDS, queued by round5.js. Crops are stills (_build/stills.mjs) in app/design/shots/r14/.
   Preview flags: &pv=gcprimary (game.js heroSet + hero glow), &pv=minimid (game.js hero mini + app/css/pv13.css). */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const IMG = (name, label) => `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px">${label ? `<span style="font:600 12px/1.2 var(--sans)">${label}</span>` : ''}<img src="app/design/shots/r14/${name}.png" alt="${label || name}" style="display:block;width:393px;max-width:100%;height:auto;border-radius:10px"></div>`;
const rows = (list, tag) => list.map(([n, label]) => IMG(tag ? `${n}-${tag}` : n, label)).join('');

const HERO = [['gbne-final', 'Packers at Patriots, final · game page hero'], ['gbne-live', 'Packers at Patriots, halftime · game page hero'], ['kc-live', 'Jets at Chiefs, halftime · game page hero (no change: both primaries are bright enough)']];
R['gc-primary'] = { id: 'gc-primary', v: 1, ready: true, name: 'Game hero: official primary colours', target: 'game.js · heroSet glow (--ga / --gb)',
  changes: ['Your note: "on the game hero for gb vs ne, we use yellow for gb and red for ne but when we scroll we use green for gb and red for ne. are we using the primary colors for this?"',
    'Not everywhere. The big game page hero glows each team in its primary, except near-black primaries, which switch to the team\'s second colour (a rule from the live glow header, approved Nov 9). Packers green #203731 and Patriots navy #002244 both count as near-black, so the hero (and the live mini hero under a stream) shows Packers gold #FFB612 and Patriots red #C60C30.',
    'The pinned score bug you see when you scroll, and the mini hero under a video, already use the official primaries: Packers green and Patriots navy. That is why the colours change as you scroll.',
    'Proposed: the hero glows in the official primary for every team, so it matches the score bug. Teams with bright primaries (Chiefs, Jets) look the same as today. Packers and Patriots get a much darker, subtler glow.'],
  current: () => V('Today', 'dark primaries swap to the second colour', rows(HERO, 'cur') + IMG('gbne-pin', 'Scrolled: the pinned score bug (already green and navy, unchanged)')),
  proposed: () => V('Official primary', 'every team, hero and score bug alike', rows(HERO, 'pro') + IMG('gbne-pin', 'Scrolled: the pinned score bug (unchanged)')) };

const MINI = [['mini-replay', 'Final, replay docked (NFL+ Premium)'], ['mini-live', 'Live at halftime, stream docked']];
R['gc-mini-mid'] = { id: 'gc-mini-mid', v: 2, ready: true, name: 'Video mini hero: status in the middle', target: 'game.js · hero(m, mini) · .gc-st',
  changes: ['Your note (v1): "halftime / final is big."', 'v2: the status in the middle is now the pinned score bug\'s small pill (Final, Halftime, or the live clock), not the big hero status.',
    'When a game has video, the hero shrinks under the player. Today its status (Final, or Live with the clock) sits on its own line above the score.',
    'Proposed: the status sits centred between the two teams, like the big hero and the pinned score bug. Live stacks the Live badge over the clock so both scores keep their room. The mini hero gets one line shorter.',
    'The proposed crops also carry the colour proposal from "Game hero: official primary colours" (the live mini hero glows green and navy instead of gold and red).'],
  current: () => V('Today', 'Packers at Patriots · status above', rows(MINI, 'cur')),
  proposed: () => V('Status in the middle', 'same games', rows(MINI, 'pro')) };
})();
