const faker = require("faker");
const _ = require("lodash");

const topic = () => faker.commerce.department().toLowerCase();

const repository = (organization, topics) => ({
  owner: organization,
  name: faker.fake("{{hacker.adjective}}-{{hacker.noun}}"),
  topics: [_.sample(topics)],
  created_at: faker.date.past(),
  updated_at: faker.date.recent(10)
});

const check = name => ({
  name,
  conclusion: _.sample(["success", "failure"]),
  status: _.sample(["completed", "pending"])
});

const review = (users, pr_creation_date, now) => ({
  user: _.sample(users),
  state: _.sample(["commented", "approved", "changes_requested"]),
  submitted_at: faker.date.between(pr_creation_date, now)
});

const pullRequest = (repos, users) => {
  const repo = _.sample(repos);
  const number = faker.random.number(100);
  const now = new Date();
  const created_at = faker.date.between(repo.created_at, now);
  return {
    number,
    title: _.capitalize(
      faker.fake("{{hacker.verb}} {{hacker.adjective}} {{hacker.noun}}")
    ),
    review_status: _.sample(["open", "approved", "changes_requested"]),
    check_status: _.sample(['failure', 'success', 'pending', 'unknown']),
    created_at: created_at,
    updated_at: faker.date.between(created_at, now),
    url: `https://github.com/${repo.owner}/${repo.name}/pull/${number}`,
    user: _.sample(users),
    comments: faker.random.number(50),
    repo,
    checks: [check("Travis CI - Pull Request"), check("Travis CI - Branch")],
    reviews: _.times(faker.random.number(5), () =>
      review(users, created_at, now)
    )
  };
};

const initialState = () => {
  const organization = faker.company.companyName(0).replace(/ /g, "");
  //const topics = _.times(4, topic);
  const topics = ['backend', 'frontend']
  const users = _.times(5, faker.internet.userName);
  const repos = _.times(10, () => repository(organization, topics));
  const pullRequests = _.times(20, () => pullRequest(repos, users));
  return {
    repos,
    pullRequests
  };
};

const updatedState = ({ repos }) => {
  const users = _.times(5, faker.internet.userName);
  const pullRequests = _.times(20, () => pullRequest(repos, users));
  return {
    repos,
    pullRequests
  };
};

module.exports = {
  initialState,
  updatedState
};
