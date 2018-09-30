const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const JiraClient = require("jira-connector");
const morgan = require("morgan");

/**
 * Based on https://github.com/bluefrg/jira-grafana-json-datasource
 * with some simplifications, style changes, and scenario-specific changes
 */

const PORT = process.env.PORT || 3001;

const jira = new JiraClient({
  host: process.env.JIRA_HOST,
  basic_auth: {
    username: process.env.JIRA_USER,
    password: process.env.JIRA_PASS
  }
});

app.use(bodyParser.json());
app.use(morgan("combined"));

app.get("/", (httpReq, httpRes) => {
  jira.myself
    .getMyself()
    .then(jiraRes => {
      httpRes.json(jiraRes);
    })
    .catch(jiraErr => {
      httpRes.json(JSON.parse(jiraErr));
    });
});

app.all("/search", async (httpReq, httpRes) => {
  const filters = await jira.makeRequest({
    uri: jira.buildURL("/filter")
  });

  const metrics = filters.map(filter => {
    return {
      text: filter.name,
      value: filter.id
    };
  });
  httpRes.json(metrics);
});

app.post("/query", (httpReq, httpRes) => {
  let result = [];

  let from = new Date(httpReq.body.range.from)
    .toISOString()
    .replace(/T/, " ")
    .replace(/\:([^:]*)$/, "");
  let to = new Date(httpReq.body.range.to)
    .toISOString()
    .replace(/T/, " ")
    .replace(/\:([^:]*)$/, "");

  let p = httpReq.body.targets.map(target => {
    return jira.search
      .search({
        jql:
          'filter = "' +
          target.target +
          '" AND created >= "' +
          from +
          '" AND created <= "' +
          to +
          '"'
      })
      .then(jiraRes => {
        if (target.type == "timeserie") {
          let datapoints = [[jiraRes.issues.length, new Date()]];

          result.push({
            target: target.target,
            datapoints: datapoints
          });
        } else if (target.type == "table") {
          let rows = jiraRes.issues.map(issue => {
            return [
              issue.key,
              issue.fields.summary,
              issue.fields.assignee ? issue.fields.assignee.displayName : "",
              issue.fields.status ? issue.fields.status.name : "",
              issue.fields.created
            ];
          });

          result.push({
            columns: [
              { text: "Key", type: "string" },
              { text: "Summary", type: "string" },
              { text: "Assignee", type: "string" },
              { text: "Status", type: "string" },
              { text: "Created", type: "time" }
            ],
            type: "table",
            rows: rows
          });
        }
      });
  });

  // Once all promises resolve, return result
  Promise.all(p).then(() => {
    httpRes.json(result);
  });
});

app.listen(PORT);
console.log(`Server is listening to port ${PORT}`);
