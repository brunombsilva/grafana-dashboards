const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const schedule = require("node-schedule");
const _ = require("lodash");

const github = require("./github");
const grafana = require("./grafana");
const jira = require("./jira");

const PORT = process.env.PORT || 3002;

const app = express();

const state = {
  repos: [],
  pullRequests: []
};

var j = schedule.scheduleJob("*/30 * * * *", update);

async function update() {
  console.log("Updating repositories list...");
  state.repos = await github.getRepositories();
  console.log("Updating metrics...");
  state.pullRequests = await github.getPullRequests(state.repos);
  console.log("Updating jira filters list...");
  state.jiraFilters = await jira.getFilters();
  console.log("All up to date.");
}

update();

app.use(bodyParser.json());
app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.send(state);
});

app.all("/search", (req, res) => {
  res.json(grafana.filters(state));
});

app.post("/query", async (req, res) => {
  const result = await Promise.all(
    req.body.targets.map(async target => {
      const [full, metric, filter, value] = /^(.*)\((.*?)=(.*?)\)$/.exec(
	target.target
      );
      console.log([full, metric, filter, value]);

      if (target.type == "timeserie") {
	let datapoints;
	switch (metric) {
	  case "pull_requests":
	    datapoints = grafana.pullRequestsTimeseries(state, filter, value);
	    break;
	  case "jira_issues":
	    datapoints = await grafana.jiraIssuesTimeseries(
	      state,
	      filter,
	      value
	    );
	    break;
	}

	return {
	  target: target.target,
	  datapoints: datapoints
	};
      } else if (target.type == "table") {
	let columns, rows;
	switch (metric) {
	  case "pull_requests":
	    ({ columns, rows } = grafana.pullRequestsTable(
	      state,
	      filter,
	      value
	    ));
	    break;
	  case "jira_issues":
	    ({ columns, rows } = await grafana.jiraIssuesTable(
	      state,
	      filter,
	      value
	    ));
	    break;
	}

	return {
	  type: "table",
	  columns,
	  rows
	};
      }
    })
  );

  res.json(result);
});

app.listen(PORT);
console.log(`Server is listening to port ${PORT}`);
