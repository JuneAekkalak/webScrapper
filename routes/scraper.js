const express = require("express");
const router = express.Router();
const axios = require("axios");
const {
  scraperAuthorScopus,
  scraperOneAuthorScopus,
} = require("../scraper/scopus/fuction_author");
const {
  scraperOneArticleScopus,
  scrapeArticleData,
} = require("../scraper/scopus/function_article");
const { scrapOneJournal, scrapJournal, resetVariableJournal } = require("../scraper/scopus/function_journal");
const {
  getOldAuthorData,
  getCountRecordInArticle,
  resetLogScraping,
  getLogScraping,
  getNowDateTime
} = require("../qurey/qurey_function");
const puppeteer = require("puppeteer");
const {
  scraperArticleScopus,
} = require("../scraper/scopus/function_article");
process.setMaxListeners(100);

const { createLogFile } = require("../scraper/scopus/function_Json");
(async () => {
  await getOldAuthorData();
})();

const { getBaseURL } = require('../qurey/baseURL')
const baseApi = require('../scraper/baseApi')


const logging = async () => {
  try {
    const logScraping = getLogScraping();

    resetLogScraping();

    const journalLog = {
      numJournalScraping: logScraping.journal.numJournalScraping,
      numUpdateCiteScoreYear: logScraping.journal.numUpdateCiteScoreYear
    }
    const finishLog = {
      message: "Scraping Data For Scopus Completed Successfully.",
      finishTime: getNowDateTime(),
      numAuthorScraping: logScraping.author.numAuthorScraping,
      numArticleScraping: logScraping.article.numArticleScraping,
      numJournalScraping: journalLog,
      errorLinkRequest: logScraping.error,
    };

    await createLogFile(finishLog, "scopus");

    return finishLog
  } catch (error) {

    console.error("An error occurred:", error);
  }
};

router.get("/scraper-scopus-cron", async (req, res) => {
  try {
    await getOldAuthorData();
    const articleCount = await getCountRecordInArticle();

    let journalRequest;
    const authorRequest = axios.get(
      `${baseApi}scraper/scopus-author`
    );
    const articleRequest = axios.get(
      `${baseApi}scraper/scopus-article`
    );
    if (articleCount !== 0) {
      journalRequest = axios.get(
        `${baseApi}scraper/scopus-journal`
      );
    }
    let finishLog

    if (articleCount === 0) {
      console.log("Scrap")
      await Promise.all([authorRequest, articleRequest]);
      setTimeout(async () => {
        await axios.get(`${baseApi}scraper/scopus-journal`);
        finishLog = await logging()
        resetVariableJournal();
        res.status(200).json(finishLog);
      }, 1500);
    } else {
      await Promise.all([authorRequest, articleRequest, journalRequest]);
      finishLog = await logging()
      resetVariableJournal();
      res.status(200).json(finishLog);
    }



  } catch (error) {
    console.error("Cron job error:", error);
    res.status(500).json({
      error: "Internal server error.",
    });
  }
});

router.get("/scopus-data", async (req, res) => {
  try {
    console.log("\nStart Scraping Data From Scopus\n");

    const [author, article] = await Promise.all([
      scraperAuthorScopus(),
      scraperArticleScopus(),
    ]);

    console.log("\nFinish Scraping Data From Scopus\n");

    res.status(200).json({
      authorScopus: author,
      articleScopus: article,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract data from Scopus",
    });
  }
});

router.get("/scopus-author", async (req, res) => {
  try {
    console.log("\n **** Start Scraping Author Data From Scopus **** \n");
    const author = await scraperAuthorScopus();
    console.log("\n **** Finish Scraping Author Data From Scopus **** \n");

    res.status(200).json({
      authorScopus: "Scraping Author Success",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract authors data from scopus",
    });
  }
});

router.get("/scopus-article", async (req, res) => {
  try {
    console.log("\n **** Start Scraping Article Data From Scopus + **** \n");
    const article = await scraperArticleScopus();
    console.log("\n **** Finish Scraping Article Data From Scopus **** \n");

    res.status(200).json({
      articleScopus: "Scraping Article Success"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract articles data from scopus",
    });
  }
});

router.get("/scopus-journal", async (req, res) => {
  try {
    const journal = await scrapJournal();
    res.status(200).json({
      journalScopus: "Scraping Journal Success"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract journals data from scopus",
    });
  }
});

// ------------------------------------------------------------------- //

router.get("/scraper-author-scopus", async (req, res) => {
  try {
    const scopus_id = req.query.scopus_id;
    console.log("\nStart Scraping Author Scopus\n");
    const author = await scraperOneAuthorScopus(scopus_id);
    console.log("\nFinish Scraping Author Scopus\n");
    console.log("author  = ", author);
    res.status(200).json({
      AuthorScopusData: author,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract Authors data from scopus",
    });
  }
});

router.get("/scraper-article-scopus", async (req, res) => {
  try {
    const eid = req.query.eid;
    console.log("\nStart Scraping Article Scopus\n");
    const article = await scraperOneArticleScopus(eid);
    console.log("\nFinish Scraping Article Scopus\n");

    res.status(200).json({
      ArticleScopusData: article,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract Authors data from scopus",
    });
  }
});

router.get("/scraper-articleOfauthor-scopus", async (req, res) => {
  try {
    const scopus_id = req.query.scopus_id;
    console.log("scopus_id  =", scopus_id);
    console.log("\nStart Scraping Article Scopus\n");
    const baseAuthorUrl = getBaseURL()
    const url = `${baseAuthorUrl}${scopus_id}`;
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const checkNumDoc = {}
    checkNumDoc.status = "first"
    const article = await scrapeArticleData(url, page, 0, scopus_id);
    await browser.close();

    console.log("\nFinish Scraping Article Scopus\n");

    res.status(200).json({
      AuthorScholarData: article.article,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract Authors data from scopus",
    });
  }
});

router.get("/scraper-journal-scopus", async (req, res) => {
  try {
    const source_id = req.query.source_id;
    console.log("\nStart Scraping Journal Scopus\n");
    const journal = await scrapOneJournal(source_id);
    console.log("\nFinish Scraping Journal Scopus\n");

    res.status(200).json({
      JournalScopusData: journal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract Authors data from scopus",
    });
  }
});

module.exports = router;