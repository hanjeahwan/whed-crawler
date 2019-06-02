import fs from 'fs';
import path from 'path';
import { countries } from './countries';
import { crawler } from './puppeteer';

try {
  (async () => {
    console.time('Crawling Time');
    await crawler.start('https://whed.net/results_institutions.php', true);

    for (const country of countries) {
      console.log('log:  Processing ->', country);
      const results = await crawler.search(country);
      const filePath = path.join(process.cwd(), "results", `${country}.json`);
      await fs.writeFileSync(filePath, JSON.stringify(results, null, 0), 'utf-8');
      console.log('log: Result ->', country, ` -> total -> ${results.length}`);
    }
    console.timeEnd('Crawling Time');
    crawler.browser.close();
  })();
} catch (err) {
  console.log('Error', err);
}
