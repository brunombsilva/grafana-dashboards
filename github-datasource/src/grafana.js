const _ = require("lodash");

const filters = state => {
  const topics = _(state.repos)
    .flatMap(r => r.topics)
    .uniq()
    .map(t => {
      return { name: "topic", value: t };
    });
  const repos = _.map(state.repos, r => {
    return { name: "repo", value: r.name };
  });
  const metrics = ["pull_requests" /*, "repos"*/];
  const filters = _.flatMap(metrics, m => {
    return [...topics, ...repos].map(f => {
      return {
        text: `${m}(${f.name}=${f.value})`,
        value: `${m}(${f.name}=${f.value})`
      };
    });
  });
  return filters;
};

const pullRequestsTimeseries = ({ pullRequests } = state, filter, value) => {
  return pullRequests.map(pr => [1, pr.updated_at]);
};

const isMatch = (pr, filter, value) => {
  switch (filter) {
    case "repo":
      return pr.repo.name == value;
    case "topic":
      console.log(pr);
      return pr.repo.topics.includes(value);
    default:
      return true;
  }
};

const pullRequestsTable = ({ pullRequests } = state, filter, value) => {
  const columns = [
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
  const rows = _(pullRequests)
    .filter(pr => isMatch(pr, filter, value))
    .map(pr => {
      const n = new Date();
      const c = new Date(pr.created_at);
      const u = new Date(pr.updated_at);
      let cd = Math.ceil((n - c) / (1000 * 60 * 60 * 24));
      let ud = Math.ceil((n - u) / (1000 * 60 * 60 * 24));
      return _.values({
        repo: pr.repo.name,
        ..._.pick(pr, [
          "number",
          "title",
          "state",
          "created_at",
          "updated_at",
          "url",
          "user",
          "comments"
        ]),
        days_since_creation: cd,
        days_since_update: ud
      });
    });

  return { columns, rows };
};

module.exports = {
  filters,
  pullRequestsTimeseries,
  pullRequestsTable
};
