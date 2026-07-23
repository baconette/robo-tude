// Syncs the two Notion databases (Domains, AI-use-cases) into the `domains`
// and `use_cases` Supabase tables. Scheduled every 24h via pg_cron + pg_net
// (see supabase/migrations/*_schedule_notion_sync_cron.sql). Can also be
// invoked manually for local testing — see supabase/functions/notion-sync/README.md.
//
// Domain and use-case rows are keyed by their Notion page ID (`notion_id`),
// which is also the primary key already used in both Supabase tables, so
// upserts are naturally idempotent and a use case's `Domain` relation maps
// directly onto `use_cases.domain_id` with no separate lookup needed.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getCheckbox,
  getFirstFileUrl,
  getNumber,
  getRelationIds,
  getRichText,
  getSelectName,
  getTitle,
  queryAllPages,
} from "./notion-client.ts";

const DOMAINS_DATA_SOURCE_ID = Deno.env.get("NOTION_DOMAINS_DATA_SOURCE_ID")!;
const USE_CASES_DATA_SOURCE_ID = Deno.env.get(
  "NOTION_USE_CASES_DATA_SOURCE_ID",
)!;
const DOMAIN_IMAGES_BUCKET = "domain-images";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function ensureDomainImagesBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!buckets.some((b) => b.name === DOMAIN_IMAGES_BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(
      DOMAIN_IMAGES_BUCKET,
      { public: true },
    );
    if (createError) throw createError;
  }
}

async function mirrorDomainImage(
  domainId: string,
  notionFileUrl: string | null,
): Promise<string | null> {
  if (!notionFileUrl) return null;

  const res = await fetch(notionFileUrl);
  if (!res.ok) {
    console.error(`Failed to download image for domain ${domainId}: ${res.status}`);
    return null;
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
  const path = `${domainId}.${ext}`;

  const { error } = await supabase.storage
    .from(DOMAIN_IMAGES_BUCKET)
    .upload(path, await res.blob(), { upsert: true, contentType });
  if (error) {
    console.error(`Failed to upload image for domain ${domainId}: ${error.message}`);
    return null;
  }

  return supabase.storage.from(DOMAIN_IMAGES_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

async function syncDomains() {
  const pages = await queryAllPages(DOMAINS_DATA_SOURCE_ID);

  const rows = await Promise.all(
    pages.map(async (page) => {
      const props = page.properties;
      const imageUrl = await mirrorDomainImage(
        page.id,
        getFirstFileUrl(props["Image"]),
      );
      return {
        notion_id: page.id,
        name: getTitle(props["Name"]),
        description: getRichText(props["Description"]),
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      };
    }),
  );

  if (rows.length > 0) {
    const { error } = await supabase.from("domains").upsert(rows, {
      onConflict: "notion_id",
    });
    if (error) throw error;
  }

  console.log(`Domains: fetched ${pages.length}, upserted ${rows.length}`);
  return pages.map((p) => p.id);
}

async function syncUseCases(validDomainIds: string[]) {
  const pages = await queryAllPages(USE_CASES_DATA_SOURCE_ID);

  const rows = [];
  const skipped: string[] = [];
  for (const page of pages) {
    const props = page.properties;
    const domainId = getRelationIds(props["Domain"])[0] ?? null;

    if (!domainId || !validDomainIds.includes(domainId)) {
      skipped.push(page.id);
      continue;
    }

    rows.push({
      notion_id: page.id,
      domain_id: domainId,
      use_case: getTitle(props["Use Case"]),
      description: getRichText(props["Description"]),
      subdomain: getRichText(props["SubDomain"]),
      alias: getRichText(props["Alias 1"]),
      order_index: getNumber(props["Order"]) ?? 0,
      status: getSelectName(props["Status"]) ?? "draft",
      published: getCheckbox(props["Published"]),
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("use_cases").upsert(rows, {
      onConflict: "notion_id",
    });
    if (error) throw error;
  }

  if (skipped.length > 0) {
    console.error(
      `Use cases skipped (no resolvable Domain relation): ${skipped.join(", ")}`,
    );
  }

  // Soft-delete: anything no longer returned by Notion is treated as
  // unpublished, never hard-deleted (preserves any future FK references,
  // e.g. from ratings). Skipped if Notion returned nothing usable, so a
  // failed/empty fetch can't wipe out every published use case.
  const currentIds = rows.map((r) => r.notion_id);
  let softDeletedCount = 0;
  if (currentIds.length > 0) {
    const { error: softDeleteError, count } = await supabase
      .from("use_cases")
      .update({ published: false, updated_at: new Date().toISOString() })
      .not(
        "notion_id",
        "in",
        `(${currentIds.map((id) => `"${id}"`).join(",")})`,
      )
      .eq("published", true)
      .select("notion_id", { count: "exact", head: true });
    if (softDeleteError) throw softDeleteError;
    softDeletedCount = count ?? 0;
  }

  console.log(
    `Use cases: fetched ${pages.length}, upserted ${rows.length}, soft-deleted ${softDeletedCount}, skipped ${skipped.length}`,
  );
}

Deno.serve(async (_req) => {
  try {
    await ensureDomainImagesBucket();
    const domainIds = await syncDomains();
    await syncUseCases(domainIds);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notion-sync failed:", error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
