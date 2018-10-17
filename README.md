# Grafana Dashboards

Some dashboards that I use to get an overview of scattered information such as:
- Jira Issues in Scrum Sprints (for a given board/team)
- GitHub Pull Requests across an Organization (for a given topic/team)

## Starting

### Environment Variables

Copy `sample.env` to `.env` and adjust to your needs.

* **GF_SECURITY_ADMIN_USER** - Grafana Administrator Username
* **GF_SECURITY_ADMIN_PASSWORD** - Grafana Administrator Password

* **JIRA_HOST** - Your Jira Domain
* **JIRA_USER** - Your Jira Username in whose name API requests will be performed
* **JIRA_PASS** - Jira Password used for API authentication

* **GITHUB_TOKEN** - GitHub Personal Token which should have access to your organization repositories
* **GITHUB_ORG** - GitHub Organization name

* **GF_VARIABLES_BOARD_VALUE** - Jira Board selected by default in dashboards
* **GF_VARIABLES_BOARD_VALUES** - Comma-separated list of Jira Boards selectable in dashboards

* **GF_VARIABLES_TOPIC_VALUE** - GitHub topic selected by default in dashboards
* **GF_VARIABLES_TOPIC_VALUES** - Comma-separated list of GitHub topics selectable in dashboards

* **GF_TIME_FROM** - Default starting time for the dashboard (For me, Sprint Planning)
* **GF_TIME_TO** - Default ending time for the dashboard (For me, End of Sprint)

## Start Applications

Start (after implicit build) all needed containers:

```
docker-compose up -d
```

And the go to [http://localhost:3000](http://localhost:3000)