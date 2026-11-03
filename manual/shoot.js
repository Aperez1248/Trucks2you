const { chromium } = require('playwright');
const D = process.cwd();
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await p.clock.setFixedTime(new Date('2026-10-29T10:42:00'));
  await p.goto('file://' + require('path').resolve(__dirname, '../prototype/index.html'));
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'.app{min-height:0!important}.toast{display:none!important}'});
  const app = p.locator('.app');
  const shot = async (n, full) => { await p.waitForTimeout(250); if (full) await p.screenshot({ path: `shots/${n}.png`, fullPage: true }); else await app.screenshot({ path: `shots/${n}.png` }); console.log('ok', n); };
const dcard = t => p.locator('main > .card').filter({ has: p.locator('h2', { hasText: t }) }).first();
  const cshot = async (n, t) => { await p.waitForTimeout(250); await dcard(t).screenshot({ path: `shots/${n}.png` }); console.log('ok', n); };
const nodsp = async n => { await p.evaluate(() => document.querySelectorAll('main > .card').forEach(c => { const h = c.querySelector('h2'); if (h && /^Dispatch info/.test(h.textContent)) c.style.display = 'none'; })); await shot(n); await p.evaluate(() => document.querySelectorAll('main > .card').forEach(c => c.style.display = '')); };
  const click = async sel => { await p.locator(sel).first().click(); await p.waitForTimeout(200); };
  const tab = async t => click(`[data-tab="${t}"]`);
  const role = async r => click(`[data-role="${r}"]`);
  const hideToast = () => p.evaluate(() => { document.getElementById('toast').hidden = true; });

  // Contractor
  await shot('c01_jobs', true);
  await click('[data-go="job:J-1042"]'); await nodsp('c02_job_detail');
  await cshot('d01_contractor_card', 'Dispatch info for drivers');
  await click('[data-act^="dsp-edit:"]'); await cshot('d02_edit', 'Edit dispatch info');
  await click('[data-act="dsp-cancel"]');
  await p.fill('#d-msg', 'Plant is down 30 minutes. Hold at staging on Oak Ave.'); await click('[data-act^="dsp-send:"]');
  await cshot('d03_sent', 'Dispatch info for drivers');
  await click('[data-go="back"]');
  await click('[data-go="job:J-1038"]'); await nodsp('c03_job_approve');
  await click('[data-go="back"]');
  await click('[data-act="new-job"]');
  await p.fill('#f-name', 'Elm St mill and pave');
  await p.fill('#f-site', 'Elm St, 3rd Ave to 7th Ave, Oakland');
  await p.fill('#f-notes', 'Stage on 3rd Ave. Vests required.');
  await shot('c04_post1');
  await click('[data-act="next"]'); await shot('c05_post2');
  await click('[data-act^="plan:w12"]'); await hideToast(); await shot('c05b_post2_used');
  await click('[data-act="next"]'); await shot('c06_post3');
  await click('[data-act="post"]'); await shot('c07_posted');
  await p.waitForTimeout(11000); await shot('c08_filling');
  await tab('live'); await p.waitForTimeout(1500); await hideToast(); await shot('c09_live');
  await tab('plants'); await hideToast(); await shot('c10_plants');
  await click('[data-go^="plant:"]'); await shot('c11_plant_detail');
  await tab('bill'); await shot('c12_billing');
  await tab('jobs'); await click('[data-go="job:J-1038"]'); await click('[data-act^="approve:"]'); await shot('c03b_approved'); await tab('bill'); await shot('c13_billing_after');

  // Owner
  await role('owner'); await shot('o01_today');
  await click('[data-act^="accept:"]'); await shot('o01b_accepted');
  await tab('find'); await shot('o02_find');
  await tab('today');
  const w = p.locator('[data-go^="work:"]'); console.log('work links', await w.count());
  await w.first().click(); await p.waitForTimeout(200); await nodsp('o03a_checkin');
  await tab('today'); await shot('o01c_today_note'); await p.locator('[data-go^="work:"]').last().click(); await p.waitForTimeout(200); await nodsp('o03_work');
  await cshot('d04_driver_new', 'Dispatch info');
  await click('[data-act^="dsp-ack:"]'); await cshot('d05_driver_read', 'Dispatch info');
  await tab('fleet'); await shot('o04_fleet');
  await tab('pay'); await shot('o05_pay');
  await tab('docs'); await shot('o06_docs');
  // sign-up
  await click('[data-act="su-start"]');
  const f = async (k, v) => p.fill(`[data-f="${k}"]`, v);
  await f('biz', 'Bayline Hauling LLC'); await f('name', 'Luis Ortega'); await f('phone', '(510) 555-0142'); await f('email', 'luis@bayline.example'); await f('usdot', '3124587');
  await click('[data-act="su-dot"]'); await shot('s01_business');
  await click('[data-act="su-next"]');
  await f('cdlExp', '2028-03-14');
  const up = async (k, file) => { await p.setInputFiles(`[data-file="${k}"]`, `${D}/${file}.png`); await p.waitForTimeout(300); };
  await up('cdlFront', 'license-front'); await up('cdlBack', 'license-back'); await up('med', 'medical-card'); await shot('s02_license');
  await click('[data-act="su-next"]');
  await up('coi', 'insurance-cert'); await f('coiExp', '2027-06-30'); await p.check('[data-f="wcExempt"]'); await shot('s03_insurance');
  await click('[data-act="su-next"]');
  await f('plate', '8KTR331'); await f('vin', '482913'); await up('reg', 'registration'); await up('insp', 'inspection'); await up('tphoto', 'truck-photo'); await shot('s04_truck');
  await click('[data-act="su-next"]');
  await up('drug', 'drug-program'); await up('w9', 'w9-form'); await click('[data-act="su-bank"]'); await hideToast();
  await p.check('[data-f="consent"]'); await p.check('[data-f="terms"]'); await p.waitForTimeout(300); await shot('s05_final');
  await click('[data-act="su-submit"]'); await hideToast(); await shot('s06_done');
  await click('[data-act="su-admin"]'); await shot('a02_applicant');
  while (await p.locator('[data-act^="verify:"]').count()) { await p.locator('[data-act^="verify:"]').first().click(); await p.waitForTimeout(150); }
  await shot('a02b_all_ok'); await click('[data-act^="approve-app:"]'); await shot('a04_after_approve');

  // Broker
  await role('broker'); await shot('b01_board');
  const bj = p.locator('[data-go^="bjob:"]'); await bj.first().click(); await p.waitForTimeout(200); await nodsp('b02_job');
  await click('[data-act^="dsp-edit:"]');
  for (const [k, v] of [['contact','Rick Alvarez, Greenfield super'],['phone','(925) 555-0133'],['staging','Ridge Rd turnout past the model homes'],['gate','Gate code 4512'],['ppe','Hard hat and vest'],['notes','Lots 12-20 only. Dump at the north end of the fill site.']]) await p.fill('#d-' + k, v);
  await click('[data-act^="dsp-save:"]'); await cshot('d06_broker_card', 'Dispatch info for drivers');
  const dis = p.locator('[data-act^="bdis"]'); if (await dis.count()) { await dis.first().click(); await p.waitForTimeout(200); await shot('b03_dispatched'); }
  await tab('board');
  const tj = p.locator('[data-go^="tjob:"]'); if (await tj.count()) { await tj.first().click(); await p.waitForTimeout(200); await shot('b04_t2job'); }
  await tab('trucks'); await hideToast(); await shot('b05_trucks');
  await tab('bfee'); await shot('b06_billing');

  // Admin
  await role('admin'); await shot('a01_vetting');
  await tab('over'); await shot('a03_overview');
  await b.close();
})();
