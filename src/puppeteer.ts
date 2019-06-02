import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

class CrawlerService {
  public browser: puppeteer.Browser;
  public page: puppeteer.Page;
  private total: number;
  private currentPage: number;
  private totalPage: number;
  private limit = 100;

  public async start(url: string, headless = false) {
    try {
      this.browser = await puppeteer.launch({
        args: ['--start-maximized'],
        devtools: true,
        headless
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.goto(url);
    } catch (error) {
      throw new Error(error);
    }
  }

  public async search(country: string) {
    try {
      // search by country
      await this.clear("#qsearch #search");
      await this.page.type('#qsearch #search', country);
      await this.page.click('#qsearch #country');
      await this.page.click('#qsearch button[type="submit"]');
      await this.page.waitForSelector('#contenu');
      const preContent = await this.page.content();

      // if no result return
      const $ = cheerio.load(preContent);
      if ($('#results li').length === 0) {
        return [];
      }

      // select limit to 100 per page
      await this.page.evaluate(() => {
        const selector = '.tri select[name="nbr_ref_pge"]';
        const option = 'option:nth-child(4)'
        const selectElement: HTMLOptionElement = document.querySelector(`${selector} > ${option}`);
        selectElement.selected = true;
        const element = document.querySelector(selector);
        const event = new Event('change', { bubbles: true });
        element.dispatchEvent(event);
      });
      await this.page.waitForNavigation();
      const content = await this.page.content();

      // set pagination
      this.setPagination(content);

      // start crwaling
      const result = await this.processCrawling();
      return result
    } catch (error) {
      throw new Error(error);
    }
  }

  public async processCrawling() {
    const results = [];
    while (this.currentPage <= this.totalPage) {
      await this.page.waitForSelector('#contenu');
      const content = await this.page.content();
      // extract html to array value
      const $ = cheerio.load(content);
      $('#results li').each((index, el) => {
        const name = $(el).find('h3 a').text().replace('Expand result for ', '').trim();
        const shortName = $(el).find('.i_name').text().trim();
        const division = $(el).find('.divisions strong').text().trim().split(';').map((i) => i.trim());
        results.push({ division, name, shortName })
      });
      // if last page stop next
      if (this.currentPage !== this.totalPage) {
        await this.page.click(`.pagination a.next`);
      }
      this.currentPage += 1;
    }
    return results;
  }

  public setPagination(content: string) {
    const $ = cheerio.load(content);
    const totalText = $('.pagination .prem').first().text();
    const total = totalText.match(/(?<=of).*/g)[0];

    this.total = +total;
    this.totalPage = Math.ceil(this.total / this.limit);
    this.currentPage = 1;
  }

  public async  clear(selector: string) {
    await this.page.evaluate(($selector) => {
      document.querySelector($selector).value = "";
    }, selector);
  }
}

// Export a singleton instance in the global namespace
export const crawler = new CrawlerService();