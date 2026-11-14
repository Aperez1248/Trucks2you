const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/guide.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: 'Trucks2U_How_It_Works.pdf', format: 'Letter', preferCSSPageSize: true, printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:8pt Arial;color:#8a8a8a;padding:0 0.65in;display:flex;justify-content:space-between"><span>How Trucks2U works · prototype, sample data</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await b.close();
})();
