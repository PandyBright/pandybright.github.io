export default {
  fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/guestbook") {
      return new Response("Not found", { status: 404 });
    }

    return env.GUESTBOOK.fetch(request);
  },
};
