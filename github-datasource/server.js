const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const morgan = require("morgan");
const octokit = require("@octokit/rest")();
const schedule = require("node-schedule");
const _ = require("lodash");

const PORT = process.env.PORT || 3002;
const TOKEN = process.env.GITHUB_TOKEN;
const ORG = process.env.GITHUB_ORG;

octokit.authenticate({
  type: "token",
  token: TOKEN
});

const state = {
  repos: []
};

var j = schedule.scheduleJob("*/30 * * * *", update);

async function update() {
  await updateRepositories();
  await updateMetrics();
}

async function paginate (method, options) {
  let response = await method({ ...options, per_page: 100 })
  let { data } = response
  while (octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response)
    data = data.concat(response.data)
  }
  return data
}

async function updateRepositories() {
  console.log("Updating repositories list...");

  let repos = await paginate(octokit.repos.getForOrg,{
    org: ORG,
    type: "private"
  });

  state.repos = await Promise.all(
    repos.map(async repo => {
      const r = {
        owner: repo.owner.login,
        repo: repo.name
      };
      const { data: topics } = await octokit.repos.getTopics(r);
      return {
        owner: repo.owner.login,
        name: repo.name,
        topics: topics.names,
        created_at: repo.created_at,
        updated_at: repo.updated_at
      };
    })
  );
  console.log("Repositories list up to date.");
}

async function updateMetrics() {
  console.log("Updating metrics...");
  state.repos = await Promise.all(
    state.repos.map(async repo => {
      const prs = await paginate(octokit.pullRequests.getAll,getR(repo));

      const pullRequests = await Promise.all(
        prs.map(async pr => {
          const comments = await paginate(octokit.pullRequests.getComments, {
            ...getR(repo),
            number: pr.number
          });
          return {
            number: pr.number,
            title: pr.title,
            state: pr.state,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            url: pr.html_url,
            user: pr.user.login,
            comments: comments.length
          };
        })
      );
      return {
        ...repo,
        pullRequests
      };
    })
  );
  console.log("Metrics up to date.");
}

const getTopics = () => {
  return _.uniq(_.flatMap(state.repos, r => r.topics));
};

const getRepos = (filter, value) => {
  return state.repos.filter(r => {
    switch (filter) {
      case "repo":
        return r.name == value;
      case "topic":
        return r.topics.includes(value);
      default:
        return true;
    }
  });
};
const getR = repo => {
  return { owner: repo.owner, repo: repo.name };
};

update();

app.use(bodyParser.json());
app.use(morgan("combined"));

app.get("/", (httpReq, httpRes) => {
  httpRes.send(state);
});

app.all("/search", (httpReq, httpRes) => {
  const topics = _.map(getTopics(), t => {
    return { name: "topic", value: t };
  });
  const repos = _.map(getRepos(), r => {
    return { name: "repo", value: r.name };
  });
  const metrics = ["pull_requests", "repos"];
  const filters = _.flatMap(metrics, m => {
    return [...topics, ...repos].map(f => {
      return {
        text: `${m}(${f.name}=${f.value})`,
        value: `${m}(${f.name}=${f.value})`
      };
    });
  });
  httpRes.json(filters);
});

app.post("/query", (httpReq, httpRes) => {
  let result = [];

  let p = httpReq.body.targets.map(target => {
    const [full, metric, filter, value] =  /^(.*)\((.*?)=(.*?)\)$/.exec(target.target);

    console.log([full, metric, filter, value])

    const repos = getRepos(filter, value);
    if (target.type == "timeserie") {
      let datapoints;
      switch (metric) {
        case "repos":
          datapoints = repos.map(r => [r.pullRequests.length, r.updated_at]);
          break;
        case "pull_requests":
          datapoints = _.flatMap(repos, r =>
            r.pullRequests.map(pr => [1, pr.updated_at])
          );
          break;
      }

      result.push({
        target: target.target,
        datapoints: datapoints
      });
    } else if (target.type == "table") {
      let columns, rows;
      switch (metric) {
        case "repos":
          columns = [
            { text: "Title", type: "string" },
            { text: "Pull Requests", type: "number" }
          ];
          rows = repos.map(r => [r.name, r.pullRequests.length]);
          break;
        case "pull_requests":
          columns = [
            { text: "Repository", type: "string" },
            { text: "Number", type: "number" },
            { text: "Title", type: "string" },
            { text: "State", type: "string" },
            { text: "Created At", type: "time" },
            { text: "Updated At", type: "time" },
            { text: "URL", type: "string" },
            { text: "Author", type: "string" },
            { text: "Comments", type: "number" },
            { text: "Days Since Creation", type: "number" },
            { text: "Days Since Last Update", type: "number" }
          ];
          rows = _.flatMap(repos, r =>
            r.pullRequests.map(pr => {
              const n = new Date();
              const c = new Date(pr.created_at);
              const u = new Date(pr.updated_at);
              let cd = Math.ceil((n - c) / (1000 * 60 * 60 * 24));
              let ud = Math.ceil((n - u) / (1000 * 60 * 60 * 24));
              return _.values({
                repo: r.name,
                ...pr,
                days_since_creation: cd,
                days_since_update: ud
              });
            })
          );
          break;
      }

      result.push({
        type: "table",
        columns,
        rows
      });
    }
  });

  httpRes.json(result);
});

app.listen(PORT);
console.log(`Server is listening to port ${PORT}`);
