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

For an existing database created before owner attribution, run `npx wrangler d1 execute pandybright-guestbook --remote --file=owner-attribution.sql` once before deploying this version of the Worker. A new database initialized from `schema.sql` already has these columns.

In the owner's browser profile, open `/guestbook/#owner-device` and generate a browser fingerprint. Set the production Worker's `OWNER_DEVICE_HASH` text variable to the displayed fingerprint and check pairing on the same page. The browser keeps the random device key in local storage. The fingerprint alone cannot authorize a post. Removing the variable revokes that browser's ability to post as the owner. If site data is cleared, generate a new fingerprint and update the variable.
