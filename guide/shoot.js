// Takes the screenshots for the Trucks2U guide. Run from this folder: node shoot.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, colorScheme: 'light' });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../app/index.html'));
  await p.addStyleTag({ content: '.toast{display:none!important}' });
  const phone = p.locator('#phone');
  const shot = async n => { await p.waitForTimeout(300); await phone.screenshot({ path: `shots/${n}.png` }); console.log('ok', n); };
  const sw = async m => { await p.click('[data-act$="-menu"]'); await p.click('.menu [data-mode=welcome]'); await p.click(`.role[data-mode=${m}]`); };

  await shot('01-welcome');
  // Driver goes online first so the request reaches them
  await p.click('.role[data-mode=driver]'); await shot('08-driver-offline');
  await p.click('[data-act=d-go]'); await shot('09-driver-online');
  // Contractor requests trucks
  await sw('contractor'); await shot('02-contractor-home');
  await p.click('.search'); await shot('03-contractor-where');
  await p.click('[data-act="c-pick:0"]'); await p.click('[data-act="c-inc:sd"]'); await shot('04-contractor-options');
  await p.click('[data-act=c-request]'); await p.waitForTimeout(4500); await shot('05-contractor-searching');
  // Driver gets the request
  await sw('driver'); await p.waitForTimeout(600); await shot('10-driver-offer');
  await p.click('[data-act=d-accept]'); await p.waitForTimeout(800); await shot('11-driver-heading');
  // Fleet sends a super dumper
  await sw('fleet'); await p.waitForTimeout(500);
  const box = await p.$('input[data-pick="SH-05"]'); if (box) { await box.click(); await p.waitForTimeout(200); }
  await shot('14-fleet-request');
  await p.click('[data-act=f-send]'); await p.waitForTimeout(800);
  await p.click('[data-act="f-tab:trucks"]'); await shot('15-fleet-trucks');
  await p.click('[data-act="f-tab:earn"]'); await shot('16-fleet-earnings');
  // Contractor watches trucks arrive, sends a note
  await sw('contractor'); await p.waitForTimeout(24000); await shot('06-contractor-live');
  await p.click('[data-act=c-note]');
  // Driver on the job
  await sw('driver'); await p.click('[data-act=d-arrive]');
  await p.setInputFiles('#ticket', 'shots/01-welcome.png'); await p.setInputFiles('#ticket', 'shots/01-welcome.png');
  await shot('12-driver-onjob');
  await p.click('[data-act=d-finish]'); await shot('13-driver-earned');
  await p.click('[data-act=d-back]');
  // Contractor ends the job
  await sw('contractor'); await p.click('[data-act=c-end]'); await p.click('[data-act="c-star:5"]'); await shot('07-contractor-done');
  await p.click('[data-act=c-reset]');
  // New driver sign-up
  await sw('driver'); await p.click('[data-act=d-menu]'); await p.click('[data-act=d-signup]');
  await p.fill('#su-name', 'Jose Ramirez'); await p.fill('#su-phone', '(510) 555-0177'); await p.fill('#su-city', 'Hayward, CA'); await shot('17-signup-you');
  await p.click('[data-act=su-next]'); await p.click('[data-act="su-type:w12"]'); await p.fill('#su-plate', '8JRT442'); await shot('18-signup-truck');
  await p.click('[data-act=su-next]');
  const fake = n => ({ name: n, mimeType: 'image/jpeg', buffer: require('fs').readFileSync('shots/01-welcome.png') });
  const names = { cdl: 'CDL_front.jpg', med: 'Medical_card.jpg', ins: 'Insurance_COI.pdf' };
  for (const k of ['cdl', 'med', 'ins']) await p.setInputFiles(`[data-doc=${k}]`, fake(names[k]));
  await p.fill('#su-dot', '3184472'); await shot('19-signup-docs');
  await p.setInputFiles('[data-doc=reg]', fake('Registration.jpg')); await p.fill('#su-dot', '3184472');
  await p.click('[data-act=su-submit]'); await shot('20-signup-pending');
  await b.close();
})();
