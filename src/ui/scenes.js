/**
 * Background pictures revealed behind the tiles, one per level (cycling). Each is an
 * original landscape drawn as an SVG string, so there are no image files. Pure: no DOM,
 * and seeded so the same level always draws the same picture.
 */

import { mulberry32 } from "../core/rng.js";

const W = 320;
const H = 180;

const round = (n) => Math.round(n * 10) / 10;

function scatter(seed, count, draw) {
  const rng = mulberry32(seed);
  let out = "";
  for (let i = 0; i < count; i += 1) out += draw(rng, i);
  return out;
}

function sky(id, top, bottom) {
  return (
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#${id})"/>`
  );
}

const hill = (y, amp, color, phase = 0) => {
  let d = `M0 ${H} L0 ${y}`;
  for (let x = 0; x <= W; x += 20) d += ` L${x} ${round(y - amp * Math.sin((x / W) * Math.PI * 2 + phase))}`;
  return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
};

const cloud = (x, y, s, color = "#ffffff") =>
  `<g fill="${color}" opacity="0.9"><ellipse cx="${x}" cy="${y}" rx="${18 * s}" ry="${7 * s}"/>` +
  `<ellipse cx="${x - 9 * s}" cy="${y - 4 * s}" rx="${9 * s}" ry="${7 * s}"/>` +
  `<ellipse cx="${x + 7 * s}" cy="${y - 6 * s}" rx="${10 * s}" ry="${8 * s}"/></g>`;

const pine = (x, base, h, color) =>
  `<path d="M${x} ${base - h} L${x - h * 0.32} ${base - h * 0.15} L${x + h * 0.32} ${base - h * 0.15} Z" fill="${color}"/>` +
  `<rect x="${x - 1.5}" y="${base - h * 0.16}" width="3" height="${h * 0.16}" fill="#4a3424"/>`;

export const SCENES = [
  {
    name: "Đồng cỏ buổi sáng",
    draw: () =>
      sky("s0", "#7ec8f2", "#d9f1ff") +
      `<circle cx="262" cy="38" r="20" fill="#ffe27a"/><circle cx="262" cy="38" r="30" fill="#ffe27a" opacity="0.25"/>` +
      cloud(70, 36, 1.2) + cloud(170, 24, 0.9) +
      hill(120, 10, "#8fd18a", 0.6) + hill(140, 8, "#5fb562", 2.2) +
      scatter(11, 40, (r) => {
        const colors = ["#ff7aa2", "#ffd34d", "#ffffff", "#b48cff"];
        return `<circle cx="${round(r() * W)}" cy="${round(140 + r() * 38)}" r="${round(1.4 + r() * 1.6)}" fill="${colors[Math.floor(r() * 4)]}"/>`;
      }),
  },
  {
    name: "Hoàng hôn trên biển",
    draw: () =>
      sky("s1", "#ff8a5c", "#ffd59e") +
      `<circle cx="160" cy="112" r="34" fill="#fff1b8"/>` +
      `<rect y="110" width="${W}" height="70" fill="#3d6fa8"/>` +
      scatter(12, 14, (r, i) => `<rect x="${round(100 + r() * 120)}" y="${116 + i * 4}" width="${round(20 + r() * 40)}" height="1.6" fill="#ffe3a3" opacity="0.7"/>`) +
      `<path d="M0 180 Q60 150 130 168 L130 180 Z" fill="#e8c27a"/>` +
      `<path d="M38 162 Q44 120 56 96" stroke="#5a3b22" stroke-width="4" fill="none"/>` +
      `<g fill="#2f6b3f"><ellipse cx="44" cy="98" rx="20" ry="5" transform="rotate(-20 44 98)"/>` +
      `<ellipse cx="68" cy="100" rx="20" ry="5" transform="rotate(25 68 100)"/>` +
      `<ellipse cx="56" cy="90" rx="16" ry="4.5" transform="rotate(-70 56 90)"/></g>`,
  },
  {
    name: "Rừng thông",
    draw: () =>
      sky("s2", "#9ad7c7", "#e7f7ef") +
      `<path d="M0 120 L60 60 L110 110 L170 46 L240 112 L280 74 L320 110 L320 180 L0 180 Z" fill="#7ea89a"/>` +
      `<path d="M170 46 L186 62 L176 60 L166 66 L156 60 Z" fill="#ffffff"/>` +
      hill(140, 6, "#4f8a5c", 1) +
      scatter(13, 22, (r) => pine(round(r() * W), round(150 + r() * 26), round(30 + r() * 26), r() < 0.5 ? "#2e6b45" : "#3b7d50")),
  },
  {
    name: "Đêm đầy sao",
    draw: () =>
      sky("s3", "#101c3d", "#3a3f7a") +
      scatter(14, 70, (r) => `<circle cx="${round(r() * W)}" cy="${round(r() * 120)}" r="${round(0.4 + r() * 1.1)}" fill="#ffffff" opacity="${round(0.5 + r() * 0.5)}"/>`) +
      `<circle cx="70" cy="44" r="16" fill="#fff6d6"/><circle cx="78" cy="38" r="14" fill="#1a2550"/>` +
      hill(132, 10, "#1f2b52", 2.5) + hill(152, 8, "#151d3a", 0.4) +
      scatter(15, 12, (r) => `<circle cx="${round(r() * W)}" cy="${round(140 + r() * 34)}" r="1.4" fill="#d9ff7a" opacity="0.85"/>`),
  },
  {
    name: "Hồ núi tuyết",
    draw: () =>
      sky("s4", "#6aa8e8", "#e6f2ff") +
      `<path d="M0 116 L70 40 L120 92 L180 30 L250 104 L290 70 L320 96 L320 116 Z" fill="#8a9bb8"/>` +
      `<path d="M70 40 L86 58 L76 56 L62 60 L56 55 Z M180 30 L200 52 L188 49 L172 56 L162 50 Z" fill="#ffffff"/>` +
      `<rect y="116" width="${W}" height="64" fill="#7fb6e0"/>` +
      `<path d="M0 116 L70 170 L120 132 L180 180 L250 124 L290 150 L320 130 L320 116 Z" fill="#9bb6d6" opacity="0.5"/>` +
      cloud(250, 30, 0.8) +
      `<path d="M0 180 L0 150 Q40 140 80 152 L80 180 Z" fill="#6f9a6a"/>`,
  },
  {
    name: "Vườn hoa anh đào",
    draw: () =>
      sky("s5", "#ffd6e4", "#fff5f8") +
      hill(150, 6, "#a8d98e", 1.4) +
      `<path d="M210 180 Q206 130 222 96 M216 120 Q240 108 262 96 M214 136 Q186 124 168 110" stroke="#6b4433" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      scatter(16, 46, (r) => `<circle cx="${round(150 + r() * 140)}" cy="${round(66 + r() * 60)}" r="${round(7 + r() * 9)}" fill="${r() < 0.5 ? "#ffb3cc" : "#ff9cbf"}" opacity="0.9"/>`) +
      scatter(17, 26, (r) => {
        const x = round(r() * W);
        const y = round(r() * H);
        return `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.2" fill="#ff9cbf" transform="rotate(${Math.floor(r() * 180)} ${x} ${y})" opacity="0.8"/>`;
      }),
  },
];

/** The picture shown behind level `level` (1-based, cycles through the scenes). */
export function sceneFor(level) {
  const index = (((level - 1) % SCENES.length) + SCENES.length) % SCENES.length;
  const scene = SCENES[index];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `${scene.draw()}</svg>`;
  return { index, name: scene.name, svg };
}
