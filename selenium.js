import { Builder, By, until } from 'selenium-webdriver';

async function openGoogleInChrome() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        await driver.get('https://www.google.com');
        await driver.manage().window().maximize();

        const signInButton = await driver.wait(
            until.elementLocated(By.xpath('//*[@id="gb"]/div[1]/div[1]/a')),
            10000
        );
        await driver.wait(until.elementIsVisible(signInButton), 5000);
        await signInButton.click();

        await driver.sleep(5000);
    } finally {
        await driver.quit();
    }
}

openGoogleInChrome();
