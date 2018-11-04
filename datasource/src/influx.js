const Influx = require("influx");
const _ = require("lodash");

const DATABASE = process.env.INFLUXDB_DATABASE || "datasource";

const influx = new Influx.InfluxDB({
  host: process.env.INFLUXDB_HOST || "localhost",
  database: DATABASE,
  schema: [
    // {
    //   measurement: "pull_request_updated",
    //   fields: {
    //     state: Influx.FieldType.STRING,
    //     comments: Influx.FieldType.INTEGER
    //   },
    //   tags: ["repo", "user", "topics"]
    // }
  ]
});

influx.createDatabase(DATABASE);

const getTopics = pr =>
  _(pr.repo.topics)
    .map(t => [`topic:${t}`, true])
    .fromPairs()
    .value();

const getPullRequests = prs =>
  _(prs)
    .map(pr => ({
      measurement: "pull_request",
      tags: {
        pr: `${pr.repo.owner}/${pr.repo.name}#${pr.number} - ${pr.title}`,
        title: pr.title,
        repo: `${pr.repo.owner}/${pr.repo.name}`,
        ...getTopics(pr),
        user: pr.user,
        topic: pr.repo.topics.length ? pr.repo.topics.join(",") : null,
        check_status: pr.check_status,
        review_status: pr.review_status
      },
      fields: {
        comments: pr.comments,
        total_checks: pr.checks.length,
        failed_checks: _(pr.checks)
          .filter(c => c.conclusion == "failure")
          .value().length,
        pending_checks: _(pr.checks)
          .filter(c => c.status !== "completed")
          .value().length,
        successful_checks: _(pr.checks)
          .filter(c => c.conclusion == "success")
          .value().length,
        reviews: _(pr.reviews)
          .map(r => r.user)
          .uniq()
          .value().length,
        approvals: _(pr.reviews)
          .filter(r => r.state == "approved")
          .value().length,
        change_requests: _(pr.reviews)
          .filter(r => r.state == "changes_requested")
          .value().length
      }
    }))
    .value();

const update = async ({ pullRequests }) => {
  const points = [
    ...getPullRequests(pullRequests)
  ];

  await influx.writePoints(points, {
    database: DATABASE,
    precision: "s"
  });
};
module.exports = {
  update
};
