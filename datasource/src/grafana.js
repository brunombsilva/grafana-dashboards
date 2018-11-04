const _ = require("lodash");
const utils = require("./utils");
const jira = require("./jira");

const githubFilters = state => {
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

  return _(metrics)
    .flatMap(m => {
      return [...topics, ...repos].map(f => {
        return {
          text: `${m}(${f.name}=${f.value})`,
          value: `${m}(${f.name}=${f.value})`
        };
      });
    })
    .values();
};

const jiraFilters = state => {
  return _(state.jiraFilters)
    .map(f => {
      return {
        text: `jira_issues(filter=${f.name})`,
        value: `jira_issues(filter=${f.id})`
      };
    })
    .values();
};

const filters = state => {
  return [...githubFilters(state), ...jiraFilters(state)];
};

const pullRequestsTimeseries = ({ pullRequests } = state, filter, value) => {
  return pullRequests.map(pr => [1, pr.updated_at]);
};

const isMatch = (pr, filter, value) => {
  switch (filter) {
    case "repo":
      return pr.repo.name == value;
    case "topic":
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
    { text: "Checks", type: "string" },
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
      return _.values({
        repo: pr.repo.name,
        number: pr.number,
        title: pr.title,
        review_status: pr.review_status,
        check_status: pr.check_status,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        url: pr.url,
        user: pr.user,
        comments: pr.comments,
        days_since_creation: utils.getNumWorkDays(c, n),
        days_since_update: utils.getNumWorkDays(u, n)
      });
    });

  return { columns, rows };
};

const jiraIssuesTimeseries = async (state, filter, value) => {
  const issues = await jira.search(value);
  let datapoints = [[issues.length, new Date()]];
  return datapoints;
};

const jiraIssuesTable = async (state, filter, value) => {
  const issues = await jira.search(value);
  const columns = [
    { text: "Key", type: "string" },
    { text: "Summary", type: "string" },
    { text: "Assignee", type: "string" },
    { text: "Status", type: "string" },
    { text: "Created", type: "time" }
  ];
  const rows = issues.map(issue => {
    return [
      issue.key,
      issue.fields.summary,
      issue.fields.assignee ? issue.fields.assignee.displayName : "",
      issue.fields.status ? issue.fields.status.name : "",
      issue.fields.created
    ];
  });

  return { columns, rows };
};

module.exports = {
  filters,
  pullRequestsTimeseries,
  pullRequestsTable,
  jiraIssuesTimeseries,
  jiraIssuesTable
};
