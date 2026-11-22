import React from 'react';
import type { InstitutionId } from '../../../gameplay/Academics';

const CAPTIONS = {
  dawn: ['Dawn Court', 'Dawnson, Aureline'],
  cyberium: ['The academy quadrangle', 'Cyberium Academy'],
  regent: ['The sovereign precinct', 'Regent Hall'],
};

/** Architectural illustrations, rather than photographs of real-world campuses. */
export default function InstitutionScene({ institution }: { institution: InstitutionId }) {
  const isDawn = institution === 'dawn';
  const isCyberium = institution === 'cyberium';
  const palette = isDawn
    ? { sky: '#eee9dd', light: '#faf4e7', wall: '#c9bda6', shade: '#9b937e', ink: '#5c6252', window: '#69796b', ground: '#d7d4c3', green: '#6a775c' }
    : isCyberium
      ? { sky: '#e1e9ea', light: '#f0f3ed', wall: '#9eafb3', shade: '#728c96', ink: '#3e5963', window: '#506f7a', ground: '#c6d2cc', green: '#637f75' }
      : { sky: '#dce1e5', light: '#e9e6dc', wall: '#b4b8b6', shade: '#7d8c92', ink: '#415765', window: '#476171', ground: '#c6cecb', green: '#61736c' };
  const [title, place] = CAPTIONS[institution];
  return <figure className={`edu-campus-scene edu-campus-scene-${institution}`}>
    <svg viewBox="0 0 640 430" role="img" aria-label={`Architectural illustration of ${title}`}>
      <rect width="640" height="430" fill={palette.sky} />
      <circle cx="498" cy="86" r="41" fill={palette.light} opacity=".8" />
      <path d="M0 280L640 260V430H0Z" fill={palette.ground} />
      <path d="M235 290L390 290L570 430H100Z" fill={palette.light} opacity=".75" />
      <g stroke={palette.ink} strokeWidth=".65" strokeLinejoin="round">
        {isCyberium ? <>
          <path d="M78 149L258 107L258 299L78 322Z" fill={palette.shade} />
          <path d="M258 107L486 144V322L258 299Z" fill={palette.light} />
          <path d="M97 169L239 137V277L97 296Z" fill={palette.window} />
          {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M${109 + i * 24} ${166 - i * 5.4}V${294 - i * 3.2}`} stroke={palette.light} opacity=".5" />)}
          {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M97 ${183 + i * 24}L239 ${153 + i * 24}`} stroke={palette.light} opacity=".5" />)}
          <path d="M283 143L459 168V194L283 174Z M283 205L459 221V248L283 236Z M283 263L459 275V303L283 294Z" fill={palette.window} />
          <path d="M417 174L541 132L579 156V322H486V204Z" fill={palette.wall} />
          <path d="M486 175L553 154V288L486 301Z" fill={palette.window} />
          {[0, 1, 2].map(i => <path key={i} d={`M${501 + i * 17} ${170 - i * 5}V${297 - i * 3.5}`} stroke={palette.light} opacity=".5" />)}
          <path d="M70 322L258 299L486 322L579 322L588 335L259 317L70 337Z" fill={palette.shade} />
        </> : <>
          <path d="M63 205L244 164V306L63 338Z" fill={palette.wall} />
          <path d="M63 205L244 164L254 151L75 190Z" fill={palette.shade} />
          <path d="M389 164L566 205V338L389 306Z" fill={palette.wall} />
          <path d="M389 164L566 205L554 190L379 151Z" fill={palette.shade} />
          <path d="M211 151H423V317H211Z" fill={palette.light} />
          {isDawn ? <path d="M199 153L317 79L435 153Z" fill={palette.shade} /> : <><path d="M198 130H436V154H198Z" fill={palette.shade} /><path d="M218 111H416V130H218Z" fill={palette.light} /><path d="M305 86H330V111H305Z" fill={palette.wall} /></>}
          <path d="M225 171H409V190H225Z" fill={palette.wall} />
          {[0, 1, 2, 3, 4].map(i => <g key={i}><rect x={235 + i * 35} y="194" width="12" height="104" fill={palette.wall} /><rect x={231 + i * 35} y="190" width="20" height="7" fill={palette.shade} /><rect x={230 + i * 35} y="297" width="22" height="7" fill={palette.shade} /></g>)}
          <path d="M274 289V232Q317 179 360 232V289Z" fill={palette.window} />
          {[0, 1, 2].map(i => <g key={i}><path d={`M${88 + i * 45} ${226 - i * 10}v43l16-3v-44Z`} fill={palette.window} /><path d={`M${442 + i * 43} ${208 + i * 10}v43l16 3v-43Z`} fill={palette.window} /></g>)}
          <path d="M207 307H427L437 317H197Z M197 319H437L449 330H185Z M185 332H449L462 343H172Z" fill={palette.wall} />
          <circle cx="317" cy={isDawn ? 132 : 166} r="11" fill={palette.ink} opacity=".7" />
        </>}
        <path d="M0 363L143 343L160 357L0 387Z M480 352L640 364V392L474 369Z" fill={palette.shade} opacity=".4" stroke="none" />
        {[{ x: 37, y: 291, r: 30 }, { x: 595, y: 300, r: 35 }, { x: 545, y: 330, r: 20 }].map((tree, i) => <g key={i}><path d={`M${tree.x} ${tree.y}v65`} fill="none" /><ellipse cx={tree.x} cy={tree.y - 15} rx={tree.r * .62} ry={tree.r * 1.4} fill={palette.green} stroke="none" /><path d={`M${tree.x - 9} ${tree.y + 63}h18`} /></g>)}
        <g fill={palette.ink} stroke="none"><circle cx="256" cy="352" r="3" /><path d="M254 357h4l2 15h-8Z" /><circle cx="366" cy="373" r="3" /><path d="M364 378h4l2 17h-8Z" /></g>
      </g>
      <path d="M30 402H610" stroke={palette.ink} opacity=".3" />
      <text x="31" y="420" fill={palette.ink} fontSize="8" letterSpacing="2" fontFamily="Arial,sans-serif">ARCHITECTURAL STUDY</text>
    </svg>
    <figcaption><strong>{title}</strong><span>{place} · Illustrated</span></figcaption>
  </figure>;
}
