# Xiaoyu’s Guestbook

The public guestbook uses a Cloudflare Worker and D1. Visitors can post without an account. The database stores the message, approximate city and country, and posting time. The Worker uses the connecting IP as a temporary rate-limit key. The database stores no IP addresses.

The production Worker and database are both named `pandybright-guestbook`. The Worker binds the provisioned D1 database as `DB` and the rate limiter as `POST_LIMIT`. `SITE_ORIGIN` limits browser requests to the homepage.

To deploy an update from this directory, sign in with `npx wrangler login` and run `npx wrangler deploy`. To use a different Cloudflare account, create a D1 database, update `database_id` in `wrangler.toml`, and initialize the schema before deployment.

```sh
npx wrangler d1 execute pandybright-guestbook --remote --file=schema.sql
npx wrangler deploy
```

Set `guestbook_api` in the site’s `_config.yml` to the deployed Worker URL ending in `/api/guestbook`, then rebuild the site. The posting form is available when this setting has a value.

The site displays the latest 50 notes. To remove a note, find its row in the Cloudflare D1 dashboard and delete it using its ID.
