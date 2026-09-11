#!/usr/bin/env node
/* data.js הוא window.TRIP = {...} — לאפליקציה צריך JSON.
   מריצים אחרי כל שינוי ב-data.js (bump.sh עושה את זה). */
const fs = require('fs');
const path = require('path');
const root = __dirname;

global.window = {};
require(path.join(root, 'data.js'));
const TRIP = global.window.TRIP;
if (!TRIP || !TRIP.days) { console.error('data.js לא הגדיר window.TRIP'); process.exit(1); }

fs.writeFileSync(path.join(root, 'trip.json'), JSON.stringify(TRIP));
const kb = (fs.statSync(path.join(root, 'trip.json')).size / 1024).toFixed(0);
console.log(`trip.json נכתב · ${TRIP.days.length} ימים · ${kb}KB`);
