import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SONGS } from "../src/ui/audio.js";
import { SCENES, sceneFor } from "../src/ui/scenes.js";

describe("background pictures", () => {
  it("every scene is a self-contained SVG with a unique name", () => {
    const names = new Set();
    for (let level = 1; level <= SCENES.length; level += 1) {
      const { name, svg } = sceneFor(level);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 320 180"/);
      assert.ok(svg.endsWith("</svg>"));
      assert.ok(!/NaN|undefined|href=/.test(svg), `${name} has a bad value or an external reference`);
      assert.ok(svg.length > 500, `${name} draws something`);
      names.add(name);
    }
    assert.equal(names.size, SCENES.length);
  });

  it("levels cycle through the scenes and always draw the same picture", () => {
    assert.equal(sceneFor(1).index, 0);
    assert.equal(sceneFor(SCENES.length + 1).index, 0);
    assert.equal(sceneFor(SCENES.length + 2).name, sceneFor(2).name);
    assert.equal(sceneFor(4).svg, sceneFor(4).svg);
  });
});

describe("background music", () => {
  it("every loop is well formed", () => {
    for (const song of SONGS) {
      assert.equal(song.lead.length, 16);
      assert.ok(song.bass.length > 0 && 16 % song.bass.length === 0);
      assert.ok(song.tempo > 0);
      assert.ok([...song.lead, ...song.bass].every((n) => n === null || Number.isInteger(n)));
    }
  });
});
