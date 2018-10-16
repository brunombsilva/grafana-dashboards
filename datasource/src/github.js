const octokit = require("@octokit/rest")();
const _ = require("lodash");

const TOKEN = process.env.GITHUB_TOKEN;
const ORG = process.env.GITHUB_ORG;

octokit.authenticate({
  type: "token",
  token: TOKEN
});

async function paginate(method, options) {
  let response = await method({ ...options, per_page: 100 });
  let { data } = response;
  while (octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response);
    data = data.concat(response.data);
  }
  return data;
}

const getR = repo => {
  return { owner: repo.owner, repo: repo.name };
};

async function getRepositories() {
  let repos = await paginate(octokit.repos.getForOrg, {
    org: ORG,
    type: "private"
  });

  return await Promise.all(
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
}

async function getPullRequests(repos) {
  const perRepo = await Promise.all(_.map(repos, async repo => {
    const prs = await paginate(octokit.pullRequests.getAll, getR(repo));

    return await Promise.all(
      prs.map(async pr => {
        const reviews = await paginate(octokit.pullRequests.getReviews, {
          ...getR(repo),
          number: pr.number
        });

        const comments = await paginate(octokit.pullRequests.getComments, {
          ...getR(repo),
          number: pr.number
        });

        const checks = await paginate(octokit.checks.listForRef, {
          ...getR(repo),
          ref: pr.head.ref
        });

        return {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          url: pr.html_url,
          user: pr.user.login,
          comments: comments.length,
          repo,
          checks: _(checks.check_runs).map(c => {
            return {
              name: c.name,
              conclusion: c.conclusion,
              status: c.status,
            };
          }),
          reviews: _(reviews).map(r => {
            return {
              user: r.user.login,
              state: r.state,
              submitted_at: r.submitted_at
            };
          })
        };
      })
    );
  }));
  return _.flatten(perRepo);
}

module.exports = { getRepositories, getPullRequests };
