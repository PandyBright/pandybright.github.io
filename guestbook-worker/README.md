# Xiaoyu’s Guestbook

The public guestbook uses a Cloudflare Worker and D1. Visitors can post without an account. The database stores the message, approximate city and country, and posting time. The Worker uses the connecting IP as a temporary rate-limit key. The database stores no IP addresses.

From this directory, sign in with `npx wrangler login` and create the database with `npx wrangler d1 create pandybright-guestbook`. Replace the placeholder `database_id` in `wrangler.toml` with the ID returned by Cloudflare.

Initialize and deploy the Worker.

```sh
npx wrangler d1 execute pandybright-guestbook --remote --file=schema.sql
npx wrangler deploy
```

Set `guestbook_api` in the site’s `_config.yml` to the deployed Worker URL ending in `/api/guestbook`, then rebuild the site. The posting form is available when this setting has a value.

The site displays the latest 50 notes. To remove a note, find its row in the Cloudflare D1 dashboard and delete it using its ID.
