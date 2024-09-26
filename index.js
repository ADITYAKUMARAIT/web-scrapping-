import { chromium } from 'playwright';  
import fs from 'fs';  
import { createObjectCsvWriter as csvWriter } from 'csv-writer';  

async function scrapeTechCrunchListing(page, url) {
    await page.goto(url);
    console.log(`Scraping: ${url}`);

    const articles = await page.$$eval('div.wp-block-group > div.wp-block-tc23-post-picker-group > div.wp-block-tc23-post-picker', elements => {
        return elements.map(article => {
            const titleElement = article.querySelector('h2.wp-block-post-title');
            const title = titleElement ? titleElement.innerText.trim() : '';
            const link = titleElement ? titleElement.querySelector('a').href : '';
            const author = article.querySelector('div.wp-block-tc23-author-card-name') ? article.querySelector('div.wp-block-tc23-author-card-name').innerText.trim() : '';
            const publicationDate = article.querySelector('time') ? article.querySelector('time').getAttribute('datetime') : '';
            const summary = article.querySelector('p.wp-block-post-excerpt__excerpt') ? article.querySelector('p.wp-block-post-excerpt__excerpt').innerText.trim() : '';

            return { title, link, author, publicationDate, summary };
        });
    });

    return articles;
}


async function scrapeTechCrunchWithPagination(browser, baseUrl, numPages=1) {
    const page = await browser.newPage();
    let allData = [];

    for (let i = 1; i <= numPages; i++) {
        const url = `${baseUrl}/page/${i}/`;
        const pageData = await scrapeTechCrunchListing(page, url);

        if (pageData.length) {
            allData = allData.concat(pageData);
        } else {
            console.log(`No data found on page ${i}, stopping pagination.`);
            break;
        }
    }

    await page.close();
    return allData;
}

async function saveDataToCSV(data, filename = 'techcrunch_listing.csv') {
    const writer = csvWriter({
        path: filename,
        header: [
            { id: 'title', title: 'Title' },
            { id: 'link', title: 'Link' },
            { id: 'author', title: 'Author' },
            { id: 'publicationDate', title: 'Publication Date' },
            { id: 'summary', title: 'Summary' }
        ]
    });

    await writer.writeRecords(data);
    console.log(`Data successfully saved to ${filename}`);
}

(async () => {
    const browser = await chromium.launch();  
    const baseUrl = 'https://techcrunch.com';
    const numPagesToScrape = 5;  

    const allArticleData = await scrapeTechCrunchWithPagination(browser, baseUrl, numPagesToScrape);

    if (allArticleData.length) {
        await saveDataToCSV(allArticleData);
    } else {
        console.log('No data collected.');
    }

    await browser.close(); 
})();
