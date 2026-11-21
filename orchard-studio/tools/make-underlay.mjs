// Writes public/debug/plan-underlay.jpg (4000 px wide) from reference/01 for the ?debug=plan view.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
mkdirSync('public/debug', { recursive: true });
await sharp('reference/01_Floor_Plan_Group_402.jpg', { limitInputPixels: false }).resize({ width: 4000 }).jpeg({ quality: 78 }).toFile('public/debug/plan-underlay.jpg');
console.log('wrote public/debug/plan-underlay.jpg');
