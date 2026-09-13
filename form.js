import { Builder, By, until } from 'selenium-webdriver';
import fs from 'node:fs';

async function openTheInternet() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .build();

  try {
    // Open the website
    await driver.get('https://the-internet.herokuapp.com/');
    await driver.manage().window().maximize();

    // Click Form Authentication
    const formAuthLink = await driver.wait(
      until.elementLocated(By.linkText('Form Authentication')),
      10000
    );

    await formAuthLink.click();

    // Enter username
    const username = await driver.wait(
      until.elementLocated(By.id('username')),
      10000
    );

    await username.sendKeys('tomsmith');

    // Enter password
    const password = await driver.findElement(By.id('password'));
    await password.sendKeys('SuperSecretPasswor');

    // Click login
    const loginButton = await driver.findElement(
      By.css('#login button[type="submit"]')
    );

    await loginButton.click();

    // Check successful login
    const successMessage = await driver.wait(
      until.elementLocated(By.css('.flash.success')),
      10000
    );

    await driver.wait(
      until.elementIsVisible(successMessage),
      5000
    );

    console.log('Successfully logged in');

    // Save screenshot
    const image = await driver.takeScreenshot();
    fs.writeFileSync('login-success.png', image, 'base64');

    console.log('Screenshot saved as login-success.png');

    await driver.sleep(5000);
  } catch (error) {
    console.error('Test failed:', error.message);

    // Save failure screenshot
    const image = await driver.takeScreenshot();
    fs.writeFileSync('login-failed.png', image, 'base64');

    console.log('Failure screenshot saved as login-failed.png');
  } finally {
    await driver.quit();
  }
}

openTheInternet();