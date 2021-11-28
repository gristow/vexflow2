// node fonts.js > output.html
//
// This demo shows how to use node-canvas to load a font (woff / otf).
// It does not currently use VexFlow.
// TODO: Check if the text fonts (PetalumaScript & Roboto Slab) are automatically
// picked up by VexFlow's ChordSymbol.
// Note: JSDOM uses node-canvas internally. https://www.npmjs.com/package/canvas

/* eslint-disable no-console */

const { registerFont, createCanvas } = require('canvas');
const { JSDOM } = require('jsdom');

const fontsDir = '../../tools/fonts/@/';
registerFont(fontsDir + 'bravura/Bravura_1.392.woff', { family: 'Bravura' });
registerFont(fontsDir + 'petaluma/Petaluma_1.065.woff', { family: 'Petaluma' });
registerFont(fontsDir + 'petaluma/PetalumaScript_1.10.woff', { family: 'PetalumaScript' });
registerFont(fontsDir + 'robotoslab/RobotoSlab-Medium_2.001.otf', { family: 'Roboto Slab' });

// Unicode code points.
const fClef = 0xe062;
const gClef = 0xe050;

function canvas1() {
  const canvas = createCanvas(850, 400);
  const ctx = canvas.getContext('2d');
  ctx.font = '100px Bravura';
  ctx.fillText(String.fromCharCode(gClef, 0x20, fClef), 20, 220);
  return canvas;
}

function canvas2() {
  const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
  const canvas = dom.window.document.createElement('canvas');
  canvas.width = 850;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.font = '100px PetalumaScript';
  ctx.fillText('Hello PetalumaScript', 20, 220);
  return canvas;
}

console.log(
  `<!DOCTYPE html><html><head><style>img { border: 1px solid #666; }</style></head><body>` +
    `<img src="${canvas1().toDataURL()}"><br><img src="${canvas2().toDataURL()}"></body></html>`
);