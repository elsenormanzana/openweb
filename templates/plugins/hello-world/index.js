export default async function register(api) {
  api.log.info("Hello World plugin loaded");

  // Create a plugin-scoped table (plugin_hello_world_plugin_visits)
  await api.db.createTable("visits", {
    id: "bigserial primary key",
    path: "text not null",
    created_at: "timestamptz not null default now()"
  });

  api.registerRoute("GET", "/api/plugins/hello-world/ping", async (_req, _reply, ctx) => {
    if (ctx.siteId) {
      const table = api.db.tableName("visits");
      await api.db.query(`insert into \"${table}\" (site_id, path) values ($1, $2)`, [ctx.siteId, "/api/plugins/hello-world/ping"]);
    }
    return {
      ok: true,
      plugin: api.plugin.slug,
      siteId: ctx.siteId,
      message: "Hello from plugin"
    };
  }, { allSites: true });

  api.cron.schedule(
    "hello-world-heartbeat",
    "*/5 * * * *",
    async ({ siteId, now }) => {
      api.log.info(`heartbeat siteId=${siteId ?? "none"} at ${now.toISOString()}`);
    },
    { allSites: true }
  );
}
