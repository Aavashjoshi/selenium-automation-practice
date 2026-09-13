import fs from 'node:fs';
import csv from 'csv-parser';
import { Builder, By, until } from 'selenium-webdriver';

const SOURCE_CSV = 'books.csv';
const DISCREPANCY_CSV = 'price_discrepancies.csv';
const TOTAL_PAGES = 2;

// Read previously saved book information from books.csv
function readSavedBooks() {
  return new Promise((resolve, reject) => {
    const savedData = [];

    fs.createReadStream(SOURCE_CSV)
      .pipe(
        csv({
          // Remove UTF-8 BOM from the CSV header
          mapHeaders: ({ header }) =>
            header.replace(/^\uFEFF/, '').trim()
        })
      )
      .on('data', (row) => {
        savedData.push({
          Title: row.Title?.trim(),
          Price: row.Price?.trim()
        });
      })
      .on('end', () => resolve(savedData))
      .on('error', reject);
  });
}

// Make a value safe for saving inside a CSV file
function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

// Save mismatched information to a separate CSV file
function saveDiscrepancies(discrepancies) {
  let content = 'Title,SavedPrice,CurrentPrice,Status\n';

  for (const item of discrepancies) {
    content += [
      escapeCsv(item.Title),
      escapeCsv(item.SavedPrice),
      escapeCsv(item.CurrentPrice),
      escapeCsv(item.Status)
    ].join(',');

    content += '\n';
  }

  fs.writeFileSync(
    DISCREPANCY_CSV,
    '\uFEFF' + content,
    'utf8'
  );
}

// Scrape the current title and price information
async function scrapeCurrentBooks(driver) {
  const currentData = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const pageUrl =
      page === 1
        ? 'https://books.toscrape.com/'
        : `https://books.toscrape.com/catalogue/page-${page}.html`;

    await driver.get(pageUrl);

    // Wait until the books appear
    await driver.wait(
      until.elementsLocated(By.css('article.product_pod')),
      10000
    );

    const books = await driver.findElements(
      By.css('article.product_pod')
    );

    // Extract title and price from every book
    for (const book of books) {
      const titleElement = await book.findElement(
        By.css('h3 > a')
      );

      const priceElement = await book.findElement(
        By.css('p.price_color')
      );

      const title = await titleElement.getAttribute('title');
      const price = await priceElement.getText();

      currentData.push({
        Title: title.trim(),
        Price: price.trim()
      });
    }

    console.log(`Page ${page} checked: ${books.length} books`);
  }

  return currentData;
}

// Run the complete price verification test
async function runPriceVerificationTest() {
  let driver;

  try {
    // Read saved information from books.csv
    const savedData = await readSavedBooks();

    console.log(
      `CSV successfully processed: ${savedData.length} books`
    );

    // Open Chrome
    driver = await new Builder()
      .forBrowser('chrome')
      .build();

    await driver.manage().window().maximize();

    // Get current information from the website
    const currentData = await scrapeCurrentBooks(driver);

    const discrepancies = [];
    let passed = 0;

    // Compare saved information with current information
    for (const savedBook of savedData) {
      const currentBook = currentData.find(
        (book) => book.Title === savedBook.Title
      );

      if (!currentBook) {
        discrepancies.push({
          Title: savedBook.Title,
          SavedPrice: savedBook.Price,
          CurrentPrice: '',
          Status: 'Book not found'
        });

        console.log(`NOT FOUND: ${savedBook.Title}`);
      } else if (currentBook.Price !== savedBook.Price) {
        discrepancies.push({
          Title: savedBook.Title,
          SavedPrice: savedBook.Price,
          CurrentPrice: currentBook.Price,
          Status: 'Price mismatch'
        });

        console.log(`PRICE MISMATCH: ${savedBook.Title}`);
        console.log(`Saved price: ${savedBook.Price}`);
        console.log(`Current price: ${currentBook.Price}`);
      } else {
        passed++;

        console.log(
          `PASS: ${savedBook.Title} | ${savedBook.Price}`
        );
      }
    }

    // Display final test result
    console.log('\nVerification Summary');
    console.log(`Passed: ${passed}`);
    console.log(`Discrepancies: ${discrepancies.length}`);
    console.log(`Total checked: ${savedData.length}`);

    // Create discrepancy report only when a mismatch exists
    if (discrepancies.length > 0) {
      saveDiscrepancies(discrepancies);

      console.log(
        `Discrepancies saved to ${DISCREPANCY_CSV}`
      );
    } else {
      console.log('No price discrepancies found.');

      // Remove an old report to prevent confusion
      if (fs.existsSync(DISCREPANCY_CSV)) {
        fs.unlinkSync(DISCREPANCY_CSV);
      }
    }
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runPriceVerificationTest();