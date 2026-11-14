// Takes the screenshots for the Trucks2U guide. Run from this folder: node shoot.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const APP = 'file://' + path.resolve(__dirname, '../app/index.html');
const SEED = () => { let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; };
(async () => {
  fs.rmSync(path.join(__dirname, 'shots'), { recursive: true, force: true }); fs.mkdirSync(path.join(__dirname, 'shots'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, colorScheme: 'light', timezoneId: 'America/Los_Angeles' });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(SEED);
  await p.goto(APP);
  await p.addStyleTag({ content: '.toast{display:none!important}' });
  const phone = p.locator('#phone');
  const shot = async n => { await p.waitForTimeout(300); await phone.screenshot({ path: `shots/${n}.png` }); console.log('ok', n); };
  const sw = async m => { await p.evaluate(m => { mode = m; C.menu = D.menu = F.menu = A.menu = false; render(); }, m); await p.waitForTimeout(200); };
  const bottom = () => p.evaluate(() => { const s = document.querySelector('.sheet, .full'); if (s) s.scrollTop = 9999; });
  const fake = n => ({ name: n, mimeType: 'image/jpeg', buffer: fs.readFileSync('shots/01-welcome.png') });

  await shot('01-welcome');
  // Contractor books trucks for tomorrow
  await p.click('.role[data-mode=contractor]'); await shot('02-c-home');
  await p.click('.search'); await shot('03-c-where');
  await p.click('[data-act="c-pick:0"]'); await p.click('[data-act="c-inc:sd"]'); await shot('04-c-trucks');
  await p.click('[data-act="c-plant+:1"]'); await p.click('[data-act="c-plant+:1"]');
  await p.fill('#c-note', 'Plant trucks load at 5:30 AM. Job trucks stage on Oak Ave. Tarp every load.');
  await p.evaluate(() => { const s = document.querySelector('.sheet'); s.scrollTop = s.querySelector('#c-note').offsetTop - 260; }); await shot('05-c-start');
  await bottom(); await shot('05b-c-when');
  await p.click('[data-act=c-request]'); await p.waitForTimeout(4500); await shot('06-c-booking');
  // Driver picks it from the job list
  await sw('driver'); await shot('10-d-home');
  await p.click('[data-act="d-board:demo"]'); await shot('11-d-request');
  await p.click('[data-act="d-take:demo"]'); await shot('12-d-myjobs');
  await p.click('[data-act="d-page:"]'); await shot('13-d-confirm');
  await p.click('[data-act="d-confirm:demo"]');
  await p.click('[data-act="d-board:0"]'); await shot('14-d-oneaday');
  await p.click('[data-act="d-page:"]');
  // Fleet sends a super dumper
  await sw('fleet');
  const box = await p.$('input[data-pick="SH-05"]'); if (box) { await box.click(); await p.waitForTimeout(200); }
  await shot('20-f-request');
  await p.click('[data-act=f-send]'); await p.waitForTimeout(500);
  await p.click('[data-act="f-tab:trucks"]'); await shot('21-f-trucks');
  await p.click('[data-act="f-tab:earn"]'); await shot('22-f-earn');
  // Contractor: all booked, then the morning of the job
  await sw('contractor'); await p.waitForTimeout(500); await shot('07-c-booked');
  await p.click('[data-act=c-morning]'); await p.waitForTimeout(6000); await shot('08-c-live');
  // Driver on the job
  await sw('driver'); await shot('15-d-heading');
  await p.click('[data-act=d-clockin]'); await p.waitForTimeout(2500);
  await p.setInputFiles('#ticket', fake('t1.jpg')); await p.setInputFiles('#ticket', fake('t2.jpg'));
  await shot('16-d-onjob');
  await p.click('[data-act="d-upd:loaded"]'); await p.waitForTimeout(2500); await shot('16b-d-loaded');
  await sw('contractor'); await p.waitForTimeout(4000); await p.evaluate(() => { const s = document.querySelector('.sheet'); s.scrollTop = s.scrollHeight; }); await shot('08b-c-updates');
  await sw('driver'); await p.click('[data-act="d-upd:atJob"]'); await p.waitForTimeout(3000);
  await p.click('[data-act=d-clockout]'); await shot('17-d-earned');
  await p.click('[data-act=d-back]');
  await p.click('[data-act=d-menu]'); await p.click('.menu [data-act="d-page:profile"] >> nth=0'); await shot('18-d-profile');
  await p.click('[data-act="d-page:"]'); await p.click('[data-act=d-menu]'); await p.click('[data-act="d-page:earn"]'); await shot('19-d-earnings');
  await p.click('[data-act="d-page:"]');
  // Contractor ends the job
  await sw('contractor'); await p.waitForTimeout(500);
  await p.click('[data-act=c-end]'); await p.click('[data-act="c-star:5"]'); await shot('09-c-done');
  await p.click('[data-act=c-reset]');
  // Admin
  await sw('admin'); await shot('23-a-review');
  await p.click('[data-act="a-open:a3"]'); await p.evaluate(() => document.querySelectorAll('.full, .sheet').forEach(e => e.scrollTop = 9999)); await shot('24-a-driver');
  await p.click('[data-act=a-back]'); await p.click('[data-act="a-tab:expiring"]'); await shot('25-a-expiring');
  // New driver sign-up
  await sw('driver'); await p.click('[data-act=d-menu]'); await p.click('[data-act=d-signup]');
  await p.fill('#su-name', 'Jose Ramirez'); await p.fill('#su-phone', '(510) 555-0177'); await p.fill('#su-email', 'jose@example.com'); await p.fill('#su-city', 'Hayward, CA'); await p.evaluate(() => document.activeElement.blur()); await shot('26-s-you');
  await p.click('[data-act=su-next]'); await p.click('[data-act="su-type:w12"]'); await p.selectOption('#su-make', 'Peterbilt'); await p.fill('#su-model', '567'); await p.fill('#su-year', '2019');
  await p.fill('#su-plate', '8JRT442'); await p.fill('#su-vin', '1NPCX4TX5KD123456'); await p.check('#su-tarp'); await p.setInputFiles('[data-doc=truck]', fake('Truck_side.jpg'));
  await p.evaluate(() => document.querySelectorAll('.full').forEach(e => e.scrollTop = 9999)); await shot('27-s-truck');
  await p.click('[data-act=su-next]');
  const names = { cdl: 'CDL_front.jpg', med: 'Medical_card.jpg', ins: 'Insurance_COI.pdf', reg: 'Registration.jpg' };
  for (const k of Object.keys(names)) await p.setInputFiles(`[data-doc=${k}]`, fake(names[k]));
  await p.fill('#su-dot', '3184472'); await p.evaluate(() => { document.activeElement.blur(); document.querySelectorAll('.full').forEach(e => e.scrollTop = 120); }); await shot('28-s-docs');
  await p.click('[data-act=su-next]'); await p.check('#su-terms'); await p.check('#su-mvr'); await shot('29-s-pending');

  // The website view on a computer
  const w = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', timezoneId: 'America/Los_Angeles' });
  await w.addInitScript(SEED);
  await w.goto(APP + '#contractor'); await w.addStyleTag({ content: '.toast{display:none!important}' });
  await w.click('[data-act="c-openjob:0"]'); await w.waitForTimeout(400);
  await w.screenshot({ path: 'shots/30-website.png' }); console.log('ok 30-website');
  await b.close();
})();
