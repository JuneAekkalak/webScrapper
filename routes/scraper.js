const express = require("express");
const router = express.Router();
const axios = require("axios");
const {
  scraperAuthorScopus,
} = require("../scraper/scopus/fuction_author");
const {
  scraperOneArticleScopus,
  scraperArticleScopus,
} = require("../scraper/scopus/function_article");
const { scrapJournal, resetVariableJournal } = require("../scraper/scopus/function_journal");
const {
  getOldAuthorData,
  getCountRecordInArticle,
  resetLogScraping,
  getLogScraping,
  getNowDateTime
} = require("../qurey/qurey_function");


const { createLogFile } = require("../scraper/scopus/function_Json");
(async () => {
  await getOldAuthorData();
})();

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

let finshLogScholar

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
        // await createLogFile(finshLogScholar, "scholar");
        res.status(200).json(finishLog);
      }, 1500);
    } else {
      await Promise.all([authorRequest, articleRequest, journalRequest]);
      finishLog = await logging()
      resetVariableJournal();
      // await createLogFile(finshLogScholar, "scholar");
      res.status(200).json(finishLog);
    }
    console.log("\n---------------------------------------------------------------")
    console.log("Finsih Log Scraping : ", finishLog)
    console.log("---------------------------------------------------------------\n")


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
    console.log("\n **** Start Scraping Journal Data From Scopus ****\n");
    const journal = await scrapJournal();
    console.log("\n **** Finish Scraping Journal Data From Scopus ****\n");
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
    console.log("\nAll Scopus Id : ", scopus_id, "\n")
    const allURLs = scopus_id.split(",").map((e) => ({
      name: e.trim(),
      scopus_id: e.trim()
    }));
    console.log("\nStart Scraping Author Scopus\n");
    const message = await scraperAuthorScopus(allURLs);
    console.log("\nFinish Scraping Author Scopus\n");
    res.status(200).json({
      AuthorScopusData: message,
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
    console.log("\nAll Scopus Id : ", scopus_id, "\n")
    const allScopusId = scopus_id.split(",").map((e) => ({
      name: e.trim(),
      scopus_id: e.trim()
    }));
    console.log("\nStart Scraping Article Scopus\n");
    const message = await scraperArticleScopus(allScopusId)
    console.log("\nFinish Scraping Article Scopus\n");


    res.status(200).json({
      AuthorScholarData: message,
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
    const allSourceId = source_id.split(",").map((e) => e.trim());
    console.log("\nStart Scraping Journal Scopus\n");
    const message = await scrapJournal(allSourceId)
    console.log("\nFinish Scraping Journal Scopus\n");

    res.status(200).json({
      JournalScopusData: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to extract Authors data from scopus",
    });
  }
});

module.exports = router;