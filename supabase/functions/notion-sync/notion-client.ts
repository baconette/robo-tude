const NOTION_VERSION = Deno.env.get("NOTION_VERSION") ?? "2025-09-03";
const NOTION_API_TOKEN = Deno.env.get("NOTION_API_TOKEN")!;

type NotionProperty = Record<string, unknown>;
export type NotionPage = {
  id: string;
  properties: Record<string, NotionProperty>;
};

async function notionFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return notionFetch(path, body);
  }

  if (!res.ok) {
    throw new Error(
      `Notion API ${path} failed: ${res.status} ${await res.text()}`,
    );
  }

  return res.json();
}

export async function queryAllPages(dataSourceId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const json = await notionFetch(`/data_sources/${dataSourceId}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);

  return pages;
}

export function getTitle(prop: NotionProperty | undefined): string {
  const arr = (prop as { title?: { plain_text: string }[] })?.title ?? [];
  return arr.map((t) => t.plain_text).join("");
}

export function getRichText(prop: NotionProperty | undefined): string {
  const arr = (prop as { rich_text?: { plain_text: string }[] })?.rich_text ?? [];
  return arr.map((t) => t.plain_text).join("");
}

export function getNumber(prop: NotionProperty | undefined): number | null {
  return (prop as { number?: number | null })?.number ?? null;
}

export function getCheckbox(prop: NotionProperty | undefined): boolean {
  return (prop as { checkbox?: boolean })?.checkbox ?? false;
}

export function getSelectName(prop: NotionProperty | undefined): string | null {
  return (prop as { select?: { name: string } | null })?.select?.name ?? null;
}

export function getRelationIds(prop: NotionProperty | undefined): string[] {
  const arr = (prop as { relation?: { id: string }[] })?.relation ?? [];
  return arr.map((r) => r.id);
}

export function getFirstFileUrl(prop: NotionProperty | undefined): string | null {
  const arr =
    (prop as {
      files?: ({ file?: { url: string } } | { external?: { url: string } })[];
    })?.files ?? [];
  const first = arr[0] as
    | { file?: { url: string } }
    | { external?: { url: string } }
    | undefined;
  if (!first) return null;
  return (first as { file?: { url: string } }).file?.url ??
    (first as { external?: { url: string } }).external?.url ??
    null;
}
