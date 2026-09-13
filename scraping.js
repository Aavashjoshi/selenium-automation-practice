import { Builder, By, until } from 'selenium-webdriver';
import fs from 'node:fs';

async function scrapeBooks() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .build();

  const titles = [];
  const prices = [];

  try {
    await driver.get('https://books.toscrape.com/');
    await driver.manage().window().maximize();

    // Scrape first two pages
    for (let page = 1; page <= 2; page++) {
      await driver.wait(
        until.elementsLocated(By.css('article.product_pod')),
        10000
      );

      const books = await driver.findElements(
        By.css('article.product_pod')
      );

      // Extract title and price
      for (const book of books) {
        const titleElement = await book.findElement(By.css('h3 > a'));
        const priceElement = await book.findElement(By.css('p.price_color'));

        const title = await titleElement.getAttribute('title');
        const price = await priceElement.getText();

        titles.push(title);
        prices.push(price);
      }

      console.log(`Page ${page} scraped successfully`);

      // Open second page
      if (page < 2) {
        const nextButton = await driver.findElement(
          By.css('li.next > a')
        );

        await nextButton.click();
      }
    }

    // Print results in Terminal
    for (let i = 0; i < titles.length; i++) {
      console.log(`Title: ${titles[i]}, Price: ${prices[i]}`);
    }

    // Prepare CSV content
    let csvContent = 'Title,Price\n';

    for (let i = 0; i < titles.length; i++) {
      const safeTitle = titles[i].replaceAll('"', '""');
      const safePrice = prices[i].replaceAll('"', '""');

      csvContent += `"${safeTitle}","${safePrice}"\n`;
    }

    // Save CSV with UTF-8 encoding
    fs.writeFileSync(
      'books.csv',
      '\uFEFF' + csvContent,
      'utf8'
    );

    console.log(`Total books collected: ${titles.length}`);
    console.log('Results saved successfully in books.csv');
  } catch (error) {
    console.error('Scraping failed:', error.message);
  } finally {
    await driver.quit();
  }
}

scrapeBooks();