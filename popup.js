document.addEventListener("DOMContentLoaded", function() {
  var searchButton = document.getElementById("searchButton");
  var consoleButton = document.getElementById("consoleButton");
  var ahrefsButton = document.getElementById("ahrefsButton");
  var archiveButton = document.getElementById("archiveButton");
  var copyHeadingsButton = document.getElementById("copyHeadingsButton");
  var highlightLinksButton = document.getElementById("highlightLinksButton");
  var copyLinksButton = document.getElementById("copyLinksButton");
  var highlightImagesButton = document.getElementById("highlightImagesButton");
  var brokenLinkCheckerButton = document.getElementById("brokenLinkCheckerButton");

  searchButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var url = "http://www.google.com/search?q=site%3A" + encodeURIComponent(tabs[0].url);
      chrome.tabs.create({ url: url });
    });
  });

  consoleButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var url = new URL(tabs[0].url);
      var domain = encodeURIComponent(url.protocol + '//' + url.hostname + '/');
      var pageUrl = encodeURIComponent(tabs[0].url);
      var searchConsoleUrl = "https://search.google.com/search-console/performance/search-analytics?resource_id=" + domain + "&breakdown=page&page=!" + pageUrl;
      chrome.tabs.create({ url: searchConsoleUrl });
    });
  });

  ahrefsButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var url = new URL(tabs[0].url);
      var hostname = url.hostname;
      var protocol = url.protocol;

      if (hostname.startsWith("www.")) {
        hostname = hostname.substr(4); // Remove "www." prefix
      }

      var path = url.pathname + url.search + url.hash; // Preserve everything after the domain

      var targetUrl = protocol + "//" + hostname + path;
      var encodedUrl = encodeURIComponent(targetUrl);

      var ahrefsUrl = "https://app.ahrefs.com/site-explorer/overview/v2/subdomains/live?target=" + encodedUrl + "&breakdown=page&page=!" + encodedUrl;
      chrome.tabs.create({ url: ahrefsUrl });
    });
  });

  archiveButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var url = "http://web.archive.org/web/*/" + tabs[0].url;
      chrome.tabs.create({ url: url });
    });
  });

  copyHeadingsButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id, allFrames: true },
          function: copyHeadingsScript
        },
        (result) => {
          var headingTexts = result[0].result;
          prompt("Copy to clipboard: Ctrl+C, Enter", headingTexts.join("\n"));
        }
      );
    });
  });

  highlightLinksButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id, allFrames: true },
          function: highlightLinksScript
        }
      );
    });
  });

  copyLinksButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id, allFrames: true },
          function: copyLinksScript
        },
        (result) => {
          var links = result[0].result;
          if (links) {
            prompt('Select everything and copy:', links);
          } else {
            alert('There are no links to other domains on this page.');
          }
        }
      );
    });
  });

  highlightImagesButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id, allFrames: true },
          function: highlightImagesScript
        }
      );
    });
  });

  brokenLinkCheckerButton.addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var tab = tabs[0];

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id, allFrames: true },
          function: getLinkUrlsScript
        },
        function(result) {
          var linkUrls = result[0].result;
          var brokenLinks = [];

          Promise.all(
            linkUrls.map(url =>
              fetch(url)
                .then(function(response) {
                  if (!response.ok) {
                    brokenLinks.push({ url: url, status: response.status });
                  }
                })
                .catch(function(error) {
                  brokenLinks.push({ url: url, status: "Error" });
                })
            )
          ).then(function() {
            displayBrokenLinksReport(brokenLinks);
          });
        }
      );
    });
  });
});

function copyHeadingsScript() {
  var headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  var headingTexts = [];
  for (var i = 0; i < headings.length; i++) {
    headingTexts.push(headings[i].textContent);
  }
  return headingTexts;
}

function highlightLinksScript() {
  var links = document.getElementsByTagName("a");
  for (var i = 0; i < links.length; i++) {
    links[i].style.backgroundColor = "yellow";
  }
}

function copyLinksScript() {
  var links = document.querySelectorAll('a[href^="http"],a[href^="//"]');
  var output = '';
  for (var i = 0; i < links.length; i++) {
    output += links[i].href + '\n';
  }
  return output;
}

function highlightImagesScript() {
  const images = document.getElementsByTagName('img');
  for (let i = 0; i < images.length; i++) {
    if (!images[i].alt || images[i].alt.trim() === '') {
      images[i].style.border = '5px solid red';
    }
  }
}

function getLinkUrlsScript() {
  var links = Array.from(document.getElementsByTagName("a")).map(a => a.href);
  return links;
}

function displayBrokenLinksReport(brokenLinks) {
  var reportContainer = document.getElementById("reportContainer");
  reportContainer.innerHTML = ""; // Clear previous report

  if (brokenLinks.length === 0) {
    reportContainer.innerText = "No broken links found.";
    return;
  }

  var reportHeader = document.createElement("h3");
  reportHeader.innerText = "Broken Links Report";

  var reportList = document.createElement("ul");
  reportList.classList.add("broken-links-list");

  brokenLinks.forEach(function(link) {
    var listItem = document.createElement("li");
    var linkText = document.createElement("span");
    linkText.innerText = link.url;
    var statusText = document.createElement("span");
    statusText.innerText = "[" + link.status + "]";
    listItem.appendChild(linkText);
    listItem.appendChild(statusText);
    reportList.appendChild(listItem);
  });

  reportContainer.appendChild(reportHeader);
  reportContainer.appendChild(reportList);
}
