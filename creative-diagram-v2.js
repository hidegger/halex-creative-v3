/* ============================================================
   Halex — Creative · isometric process diagram
   Two rings of 5 nodes + bridge, drawn with isometric projection
   ============================================================ */
(function () {
  'use strict';
  const stage = document.getElementById('isoSvg');
  if (!stage) return;

  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // viewBox  (kept proportional to .iso-wrap)
  const VW = 1840, VH = 720;
  stage.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  stage.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // ---- isometric projection ----
  // world (x, y, z) → screen (sx, sy)
  // 30°-30° iso, y goes up in world but screen-y inverts
  const COS30 = Math.cos(Math.PI / 6); // 0.866
  const SIN30 = Math.sin(Math.PI / 6); // 0.5
  function iso(x, y, z) {
    return [
      (x - z) * COS30,
      (x + z) * SIN30 - y
    ];
  }
  // world origin maps to (cx, cy)
  const ORIG = { x: VW / 2, y: VH / 2 + 60 };
  function project(p) {
    const [sx, sy] = iso(p.x, p.y, p.z);
    return [ORIG.x + sx, ORIG.y + sy];
  }

  // ---- layout: two flat rings (y=0), 5 nodes each, in world XZ plane ----
  const RING_R = 240;           // ring radius in world units
  const RING_OFFSET_X = 480;    // ring centers along x
  const NODE_SIZE = { w: 200, d: 120, h: 36 }; // box footprint (x by z) + thickness y

  // angles laid out so we get a pleasing wide arc
  const angles = [
    -Math.PI * 0.95, // top-left-ish
    -Math.PI * 0.55,
    -Math.PI * 0.15,
     Math.PI * 0.25,
     Math.PI * 0.75,
  ];

  const ringL = {
    cx: -RING_OFFSET_X, cz: 0,
    labels: ['Гипотеза', 'Обучение', 'Симуляция', 'Эксперименты', 'Релиз'],
    nums:   ['01', '02', '03', '04', '05'],
    accent: [false, false, false, false, true],
    accentBlue: [false, false, false, true, false],
  };
  const ringR = {
    cx:  RING_OFFSET_X, cz: 0,
    labels: ['Данные', 'Предсказание', 'Стратегия', 'Гейтвей', 'Действия на рынке'],
    nums:   ['01', '02', '03', '04', '05'],
    accent: [true, false, false, false, false],
    accentBlue: [false, false, false, false, true],
  };

  function ringNodes(ring) {
    return angles.map((a, i) => ({
      idx: i,
      label: ring.labels[i],
      num: ring.nums[i],
      accent: ring.accent[i],
      accentBlue: ring.accentBlue[i],
      x: ring.cx + Math.cos(a) * RING_R,
      z: ring.cz + Math.sin(a) * RING_R,
      y: 0,
    }));
  }
  const nodesL = ringNodes(ringL);
  const nodesR = ringNodes(ringR);

  // ---- svg defs ----
  const defs = el('defs');
  defs.innerHTML = `
    <linearGradient id="bridgeGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#76FBCC" stop-opacity="0"></stop>
      <stop offset="0.5" stop-color="#76FBCC" stop-opacity="1"></stop>
      <stop offset="1" stop-color="#76FBCC" stop-opacity="0"></stop>
    </linearGradient>
    <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3A4658"></stop>
      <stop offset="1" stop-color="#5A6A82"></stop>
    </linearGradient>
    <radialGradient id="nodeGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#76FBCC" stop-opacity="0.55"></stop>
      <stop offset="1" stop-color="#76FBCC" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="floorGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#1A4DFF" stop-opacity="0.25"></stop>
      <stop offset="0.6" stop-color="#1A4DFF" stop-opacity="0.05"></stop>
      <stop offset="1" stop-color="#1A4DFF" stop-opacity="0"></stop>
    </radialGradient>
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="b"></feGaussianBlur>
      <feMerge>
        <feMergeNode in="b"></feMergeNode>
        <feMergeNode in="SourceGraphic"></feMergeNode>
      </feMerge>
    </filter>
    <marker id="arrowMint" markerWidth="9" markerHeight="9" refX="6.5" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="#76FBCC"/>
    </marker>
    <marker id="arrowBlue" markerWidth="9" markerHeight="9" refX="6.5" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="#CAFABE"/>
    </marker>
  `;
  stage.appendChild(defs);

  // ---- floor: two big elliptical glows under each ring ----
  function floorEllipse(cx, cz) {
    const [sx, sy] = iso(cx, 0, cz);
    const c = el('ellipse', {
      cx: ORIG.x + sx, cy: ORIG.y + sy,
      rx: RING_R * COS30 * 1.6, ry: RING_R * SIN30 * 1.6,
      fill: 'url(#floorGlow)',
    });
    return c;
  }
  stage.appendChild(floorEllipse(ringL.cx, ringL.cz));
  stage.appendChild(floorEllipse(ringR.cx, ringR.cz));

  // ---- ring guide circles (very faint) ----
  function ringGuide(cx, cz) {
    const pts = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const [sx, sy] = iso(cx + Math.cos(a) * RING_R, 0, cz + Math.sin(a) * RING_R);
      pts.push((ORIG.x + sx) + ',' + (ORIG.y + sy));
    }
    return el('polyline', {
      points: pts.join(' '),
      fill: 'none', stroke: '#1A2230', 'stroke-width': 1,
      'stroke-dasharray': '2 6',
    });
  }
  stage.appendChild(ringGuide(ringL.cx, ringL.cz));
  stage.appendChild(ringGuide(ringR.cx, ringR.cz));

  // ---- edges (cycle order) — between consecutive ring nodes ----
  function drawCycleEdges(nodes, group) {
    const N = nodes.length;
    const edgeNodes = [];
    for (let i = 0; i < N; i++) {
      const a = nodes[i], b = nodes[(i + 1) % N];
      const [ax, ay] = project(topOf(a));
      const [bx, by] = project(topOf(b));
      const path = el('path', {
        d: `M ${ax} ${ay} L ${bx} ${by}`,
        fill: 'none',
        stroke: '#2A3548',
        'stroke-width': 1.4,
        'stroke-linecap': 'round',
      });
      group.appendChild(path);

      // animated flow on top
      const flow = el('path', {
        d: `M ${ax} ${ay} L ${bx} ${by}`,
        fill: 'none',
        stroke: '#76FBCC', 'stroke-opacity': '0.85',
        'stroke-width': 1.6,
        'stroke-dasharray': '6 18',
        'stroke-linecap': 'round',
      });
      flow.style.animation = `dash-flow ${1.4 + i * 0.06}s linear infinite`;
      flow.style.animationDelay = (i * 0.18) + 's';
      group.appendChild(flow);
      edgeNodes.push({ flow });
    }
    return edgeNodes;
  }

  // top-center of a node box (anchor for edges)
  function topOf(n) {
    return { x: n.x, y: n.y + NODE_SIZE.h, z: n.z };
  }
  // bottom-center
  function botOf(n) {
    return { x: n.x, y: n.y, z: n.z };
  }

  // groups for z-sort
  const gFloor = el('g'); stage.appendChild(gFloor);
  const gEdges = el('g'); stage.appendChild(gEdges);
  const gNodes = el('g'); stage.appendChild(gNodes);
  const gBridge = el('g'); stage.appendChild(gBridge);
  const gLabels = el('g'); stage.appendChild(gLabels);

  drawCycleEdges(nodesL, gEdges);
  drawCycleEdges(nodesR, gEdges);

  // ---- isometric node boxes ----
  // For each node, draw 3 visible faces of a thin box.
  // Faces: top, left, right
  function nodeBox(n) {
    const g = el('g', { class: 'iso-node' + (n.accent ? ' is-accent' : '') });

    const hw = NODE_SIZE.w / 2, hd = NODE_SIZE.d / 2, h = NODE_SIZE.h;
    // 8 corners of the box around (n.x, n.y..n.y+h, n.z)
    const C = {
      // top (y = n.y + h)
      tNW: { x: n.x - hw, y: n.y + h, z: n.z - hd },
      tNE: { x: n.x + hw, y: n.y + h, z: n.z - hd },
      tSE: { x: n.x + hw, y: n.y + h, z: n.z + hd },
      tSW: { x: n.x - hw, y: n.y + h, z: n.z + hd },
      // bottom
      bNW: { x: n.x - hw, y: n.y, z: n.z - hd },
      bNE: { x: n.x + hw, y: n.y, z: n.z - hd },
      bSE: { x: n.x + hw, y: n.y, z: n.z + hd },
      bSW: { x: n.x - hw, y: n.y, z: n.z + hd },
    };
    const P = (p) => project(p).join(',');

    // accent color: mint (#76FBCC) or blue (#2E6BFF)
    const acc = n.accent || n.accentBlue;
    const AC = n.accentBlue ? '46,107,255' : '118,251,204';
    const ACsolid = n.accentBlue ? '#2E6BFF' : '#76FBCC';
    const stroke = acc ? ACsolid : '#5A6A82';
    const fill = acc ? `rgba(${AC},0.07)` : 'rgba(16,21,27,0.7)';
    const sw = acc ? 1.6 : 1.2;
    const filter = acc ? 'url(#softGlow)' : '';

    // top face
    g.appendChild(el('polygon', {
      points: [C.tNW, C.tNE, C.tSE, C.tSW].map(P).join(' '),
      fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round',
    }));
    // right side face (between front edge SE and NE)
    g.appendChild(el('polygon', {
      points: [C.tSE, C.tNE, C.bNE, C.bSE].map(P).join(' '),
      fill: acc ? `rgba(${AC},0.12)` : 'rgba(10,13,17,0.85)',
      stroke, 'stroke-width': sw, 'stroke-linejoin': 'round',
    }));
    // left side face (between front edge SE and SW)
    g.appendChild(el('polygon', {
      points: [C.tSE, C.tSW, C.bSW, C.bSE].map(P).join(' '),
      fill: acc ? `rgba(${AC},0.10)` : 'rgba(13,17,22,0.9)',
      stroke, 'stroke-width': sw, 'stroke-linejoin': 'round',
    }));

    if (acc) g.setAttribute('filter', filter);

    // top-face label (number + name)
    const [topCx, topCy] = project({ x: n.x, y: n.y + h, z: n.z });
    const lbl = el('g', { transform: `translate(${topCx} ${topCy})` });
    lbl.appendChild(el('text', {
      x: 0, y: -10, 'text-anchor': 'middle',
      fill: '#8C97A6', 'font-family': 'JetBrains Mono, monospace',
      'font-size': 11, 'letter-spacing': 1.4,
    }, n.num));
    lbl.appendChild(el('text', {
      x: 0, y: 8, 'text-anchor': 'middle',
      fill: acc ? ACsolid : '#F4F6F8',
      'font-family': 'Space Grotesk, sans-serif',
      'font-weight': 600, 'font-size': 15, 'letter-spacing': -0.1,
    }, n.label));
    gLabels.appendChild(lbl);

    // accent: pulsing top dot
    if (acc) {
      const dot = el('circle', {
        cx: topCx, cy: topCy - 28, r: 4,
        fill: ACsolid, filter: 'url(#softGlow)',
      });
      dot.style.setProperty('--r', '4');
      dot.style.animation = 'pulse-node 2s ease-in-out infinite';
      gLabels.appendChild(dot);
    }

    return g;
  }

  // draw nodes (z-sort by projected y so back ones render first)
  function sortByDepth(nodes) {
    return [...nodes].map(n => ({
      n, depth: project({ x: n.x, y: 0, z: n.z })[1]
    })).sort((a, b) => a.depth - b.depth).map(o => o.n);
  }
  for (const n of sortByDepth([...nodesL, ...nodesR])) {
    gNodes.appendChild(nodeBox(n));
  }

  // ---- BRIDGE: release(L last) → data(R first), curved through center ----
  const release = nodesL[4];
  const data = nodesR[0];
  const [rx, ry] = project(topOf(release));
  const [dx, dy] = project(topOf(data));
  // control point: lifted into the air between them
  const midWorld = { x: (release.x + data.x) / 2, y: 280, z: (release.z + data.z) / 2 };
  const [mx, my] = project(midWorld);

  const bridgePath = el('path', {
    d: `M ${rx} ${ry} Q ${mx} ${my} ${dx} ${dy}`,
    fill: 'none',
    stroke: '#76FBCC', 'stroke-width': 2,
    'stroke-linecap': 'round',
    'marker-end': 'url(#arrowMint)',
    filter: 'url(#softGlow)',
  });
  gBridge.appendChild(bridgePath);

  // soft underlay for the bridge
  const bridgeUnder = el('path', {
    d: `M ${rx} ${ry} Q ${mx} ${my} ${dx} ${dy}`,
    fill: 'none',
    stroke: 'rgba(118,251,204,0.18)', 'stroke-width': 10,
  });
  gBridge.insertBefore(bridgeUnder, bridgePath);

  // travelling pulse on bridge
  const travel = el('circle', {
    r: 5, fill: '#76FBCC', filter: 'url(#softGlow)',
  });
  gBridge.appendChild(travel);

  // bridge mid-label — sits on the bridge in the central corridor, between the two rings
  const t_pill = 0.78;
  const nmpX = Math.pow(1-t_pill,2)*rx + 2*(1-t_pill)*t_pill*mx + Math.pow(t_pill,2)*dx;
  const nmpY = Math.pow(1-t_pill,2)*ry + 2*(1-t_pill)*t_pill*my + Math.pow(t_pill,2)*dy;
  const blbl = el('g', { transform: `translate(${nmpX} ${nmpY})` });
  blbl.appendChild(el('rect', {
    x: -90, y: -14, width: 180, height: 24, rx: 12,
    fill: 'rgba(10,13,17,0.92)',
    stroke: 'rgba(118,251,204,0.5)',
  }));
  blbl.appendChild(el('text', {
    x: 0, y: 3, 'text-anchor': 'middle',
    fill: '#76FBCC', 'font-family': 'JetBrains Mono, monospace',
    'font-size': 11, 'letter-spacing': 1.8, 'font-weight': 500,
  }, 'НОВЫЕ МОДЕЛИ'));
  gLabels.appendChild(blbl);

  // ---- feedback arc under the diagram (market → experiments) ----
  const market = nodesR[4];
  const hypo = nodesL[3];
  const [mxs, mys] = project(botOf(market));
  const [hxs, hys] = project(botOf(hypo));
  const dipY = Math.max(mys, hys) + 200;
  const fbPath = el('path', {
    d: `M ${mxs} ${mys} C ${mxs} ${dipY}, ${hxs} ${dipY}, ${hxs} ${hys}`,
    fill: 'none',
    stroke: '#4D86FF', 'stroke-opacity': '1', 'stroke-width': 2.4,
    'stroke-dasharray': '6 10',
    'stroke-linecap': 'round',
    'marker-end': 'url(#arrowBlue)',
    filter: 'url(#softGlow)',
  });
  fbPath.style.animation = 'dash-flow 3s linear infinite';
  gEdges.appendChild(fbPath);

  // feedback label — at the actual lowest point of the cubic bezier
  const fbCx = (mxs + hxs) / 2;
  const fbCy = 0.125 * (mys + hys) + 0.75 * dipY;
  const fbLbl = el('g', { transform: `translate(${fbCx} ${fbCy + 18})` });
  fbLbl.appendChild(el('rect', {
    x: -200, y: -14, width: 400, height: 24, rx: 12,
    fill: 'rgba(10,13,17,0.92)',
    stroke: 'rgba(77,134,255,0.9)',
  }));
  fbLbl.appendChild(el('text', {
    x: 0, y: 3, 'text-anchor': 'middle',
    fill: '#7FA8FF', 'font-family': 'JetBrains Mono, monospace',
    'font-size': 11, 'letter-spacing': 1.6, 'font-weight': 500,
  }, 'ОБРАТНАЯ СВЯЗЬ: РЕЗУЛЬТАТ И P&L'));
  gLabels.appendChild(fbLbl);

  // ---- travelling dot animation along bridgePath ----
  if (!reduce) {
    const bl = bridgePath.getTotalLength();
    function tick(t) {
      const u = ((t / 2800) % 1);
      const p = bridgePath.getPointAtLength(u * bl);
      travel.setAttribute('cx', p.x);
      travel.setAttribute('cy', p.y);
      travel.setAttribute('opacity', u < 0.04 || u > 0.96 ? 0 : 1);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } else {
    travel.setAttribute('opacity', 0);
  }

  // ---- helpers ----
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
})();
