const JiraClient = require("jira-connector");
const _ = require("lodash");

const jira = new JiraClient({
  host: process.env.JIRA_HOST,
  basic_auth: {
    username: process.env.JIRA_USER,
    password: process.env.JIRA_PASS
  }
});

const getFilters = async () => {
  const filters = await jira.makeRequest({
    uri: jira.buildURL("/filter")
  });
  return _(filters).map(f => {
    return { name: f.name, id: f.id, jql: f.jql };
  });
};

const search = async (filter_name) => {
  const res = await jira.search.search({
    jql: `filter = "${filter_name}"`
  });
  return res.issues;
};

module.exports = {
  getFilters,
  search
};
