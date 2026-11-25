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

For an existing database, apply `likes.sql` with `npx wrangler d1 execute pandybright-guestbook --remote --file=likes.sql` before deploying the star reactions. Stars use the hash of a random browser key or the verified owner identity. Deleting a note removes its stars, replies, and reply stars.

For an existing database, apply `reply-targets.sql` once with `npx wrangler d1 execute pandybright-guestbook --remote --file=reply-targets.sql` before deploying replies to replies. Existing replies refer to their original note. Replies stay in chronological order under that note. Deleting an individual reply leaves later replies in place and removes the deleted text from their references.

The guestbook recognizes an approved browser profile when it opens and shows the owner's avatar next to the title. To pair a profile after changing browsers or clearing site data, open `/guestbook/` in that profile and run the following in the browser's developer console. Set the production Worker's `OWNER_DEVICE_HASH` text variable to the resulting fingerprint, then reload the guestbook. Removing the variable revokes that browser's ability to post as the owner.

```js
const storageKey = "pandybright-guestbook-device";
const toHex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
const key = localStorage.getItem(storageKey) || toHex(crypto.getRandomValues(new Uint8Array(32)));
localStorage.setItem(storageKey, key);
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
console.log(toHex(new Uint8Array(digest)));
```
