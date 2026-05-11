const https = require("https");

const SITEMAP_URL = "https://calnexapp.com/sitemap.xml";
const endpoint = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;

https
  .get(endpoint, (response) => {
    console.log(`Google sitemap ping response: ${response.statusCode}`);
    response.resume();
  })
  .on("error", (error) => {
    console.log(`Google sitemap ping skipped: ${error.message}`);
  });
