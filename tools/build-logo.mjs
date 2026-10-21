// Writes the logo files in assets/ from src/logo.js (run after changing the logotype):
//   node tools/build-logo.mjs
import fs from 'node:fs';
const { logo, mark } = await import(new URL('../src/logo.js', import.meta.url).href);
const standalone = svg => svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#1D1D1F" ').replace(/ class="[^"]*"/, '');
fs.writeFileSync(new URL('../assets/', import.meta.url).pathname + 'allure-analytics-logo.svg', standalone(logo()) + '\n');
fs.writeFileSync(new URL('../assets/', import.meta.url).pathname + 'allure-analytics-mark.svg', standalone(mark()) + '\n');
// Tab icon: the mark in light ink on a black rounded square.
const m = mark();
const vb = m.match(/viewBox="0 0 ([\d.]+) 20"/)[1];
const inner = m.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const scale = 20 / Number(vb);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1D1D1F"/><g style="color:#F5F5F7" transform="translate(6 ${16 - 10 * scale}) scale(${scale.toFixed(4)})">${inner}</g></svg>`;
fs.writeFileSync(new URL('../assets/', import.meta.url).pathname + 'allure-analytics-icon.svg', icon + '\n');
