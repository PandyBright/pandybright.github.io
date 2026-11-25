# Xiaoyu’s Guestbook

The public guestbook uses a Cloudflare Worker and D1. Visitors can post without an account. The database stores the message, approximate city and country, and posting time. The Worker uses the connecting IP as a temporary rate-limit key. The database stores no IP addresses.

The production Worker and database are both named `pandybright-guestbook`. The Worker binds the provisioned D1 database as `DB` and the rate limiter as `POST_LIMIT`. `SITE_ORIGIN` limits browser requests to the homepage.

To deploy an update from this directory, sign in with `npx wrangler login` and run `npx wrangler deploy`. To use a different Cloudflare account, create a D1 database, update `database_id` in `wrangler.toml`, and initialize the schema before deployment.

```sh
npx wrangler d1 execute pandybright-guestbook --remote --file=schema.sql
npx wrangler deploy
```

The site uses `https://pandybright-guestbook.pages.dev/api/guestbook` because mainland China probes could not reach the default Worker hostname. The Cloudflare Pages project uses the script in `pages/_worker.js` and a production service binding named `GUESTBOOK` that points at the Worker. Updating the Worker does not require redeploying Pages unless the forwarding script or its binding changes.

The site displays the latest 50 notes with their replies. To remove a reply, delete its row from `guestbook_replies`. Deleting a note from `guestbook_notes` also removes its replies. For an existing database, run the schema command above before deploying the Worker to add reply storage.
