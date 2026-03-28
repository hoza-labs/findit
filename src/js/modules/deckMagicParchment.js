/*
 * Portions of this module are adapted from the following work:
 *   "Old parchment v.2.3" by AgnusDei
 *   https://codepen.io/AgnusDei/pen/NWPbOxL
 *
 * MIT License
 *
 * Copyright (c) 2026 Bradley Hoza (this file, a derivative work)
 * Copyright (c) 2020-2026 AgnusDei (the original work)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const FILTER_ID = 'deck-magic-wavy';

function createSvgElement(tagName) {
  return document.createElementNS(SVG_NS, tagName);
}

function updateParchmentHeight(stageElement) {
  const parchmentElement = stageElement?.querySelector('.deck-magic-parchment');
  const containElement = stageElement?.querySelector('.deck-magic-contain');
  if (!parchmentElement || !containElement) {
    return;
  }

  parchmentElement.style.height = `${containElement.offsetHeight}px`;
}

export function ensureDeckMagicParchmentFilter() {
  if (!document.getElementById(FILTER_ID)) {
    const svg = createSvgElement('svg');
    svg.classList.add('deck-magic-filter-defs');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const defs = createSvgElement('defs');
    const filter = createSvgElement('filter');
    filter.setAttribute('id', FILTER_ID);

    const turbulence = createSvgElement('feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('baseFrequency', '0.01');
    turbulence.setAttribute('numOctaves', '5');
    turbulence.setAttribute('seed', '2');
    turbulence.setAttribute('result', 'noise');

    const displacement = createSvgElement('feDisplacementMap');
    displacement.setAttribute('in', 'SourceGraphic');
    displacement.setAttribute('in2', 'noise');
    displacement.setAttribute('scale', '3');

    filter.append(turbulence, displacement);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.appendChild(svg);
  }

  const stageElements = Array.from(document.querySelectorAll('.deck-magic-stage'));
  for (const stageElement of stageElements) {
    updateParchmentHeight(stageElement);
  }

  const handleResize = () => {
    for (const stageElement of stageElements) {
      updateParchmentHeight(stageElement);
    }
  };

  window.addEventListener('resize', handleResize, { passive: true });
  requestAnimationFrame(handleResize);
}
