#!/usr/bin/env node
/**
 * Generate a standalone support-card event relation inspector.
 *
 * This is a debugging aid for reverse-engineering master.mdb relations. It is not
 * part of the application bundle.
 */

import { closeDatabase, openDatabase, queryAll } from '../master-data/database';
import { resolveMasterDbPath } from '../master-data/shared';

type SupportEventDebugRow = {
  supportCardId: number;
  supportCardName: string;
  charaId: number;
  charaName: string;
  storyId: number;
  storyTitle: string;
  showProgress1: number;
  showProgress2: number;
  showProgress3: number;
  conclusionRootId: number | null;
  conclusionId: number | null;
  productionCategoryId: number | null;
  productionItemDir: string | null;
  productionItemName: string | null;
  guideId: number | null;
};

type RelatedTableSummary = {
  table: string;
  columns: Array<string>;
  rowCount: number;
  relationColumns: Array<string>;
  sampleRows: Array<Record<string, unknown>>;
};

const OUTPUT_PATH = 'docs/guides/support-event-debug.html';
const RELATED_COLUMN_PATTERNS = [
  /story_id/,
  /support_card_id/,
  /support_chara_id/,
  /card_chara_id/,
  /^card_id$/,
  /conclusion_id/,
  /reward/,
  /skill/,
  /hint/,
  /event/
];

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replaceAll('</script>', '<\\/script>');
}

async function main() {
  const dbPath = await resolveMasterDbPath();
  const db = openDatabase(dbPath);

  try {
    const events = queryAll<SupportEventDebugRow>(
      db,
      `SELECT
         s.support_card_id AS supportCardId,
         COALESCE(card_name.text, '') AS supportCardName,
         sc.chara_id AS charaId,
         COALESCE(chara_name.text, '') AS charaName,
         s.story_id AS storyId,
         COALESCE(story_title.text, '') AS storyTitle,
         s.show_progress_1 AS showProgress1,
         s.show_progress_2 AS showProgress2,
         s.show_progress_3 AS showProgress3,
         c.root_id AS conclusionRootId,
         c.conclusion_id AS conclusionId,
         p.event_category_id AS productionCategoryId,
         p.item_dir AS productionItemDir,
         p.item_name AS productionItemName,
         g.guide_id AS guideId
       FROM single_mode_story_data s
       JOIN support_card_data sc ON sc.id = s.support_card_id
       LEFT JOIN text_data card_name ON card_name.category = 76 AND card_name."index" = s.support_card_id
       LEFT JOIN text_data chara_name ON chara_name.category = 77 AND chara_name."index" = s.support_card_id
       LEFT JOIN text_data story_title ON story_title.category = 181 AND story_title."index" = s.story_id
       LEFT JOIN single_mode_conclusion_set c ON c.story_id = s.story_id
       LEFT JOIN single_mode_event_production p ON p.story_id = s.story_id
       LEFT JOIN single_mode_story_guide g ON g.story_id = s.story_id
       WHERE s.support_card_id <> 0
       ORDER BY s.support_card_id, s.story_id`
    );

    const tableNames = queryAll<{ name: string }>(
      db,
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    );

    const relatedTables: Array<RelatedTableSummary> = [];

    for (const { name } of tableNames) {
      const columns = queryAll<{ name: string; type: string }>(db, `PRAGMA table_info(${name})`);
      const columnNames = columns.map((column) => column.name);
      const relationColumns = columnNames.filter((column) =>
        RELATED_COLUMN_PATTERNS.some((pattern) => pattern.test(column))
      );

      if (relationColumns.length === 0) {
        continue;
      }

      const rowCount = queryAll<{ count: number }>(db, `SELECT COUNT(*) AS count FROM "${name}"`)[0]
        .count;
      const sampleRows = queryAll<Record<string, unknown>>(db, `SELECT * FROM "${name}" LIMIT 5`);

      relatedTables.push({
        table: name,
        columns: columnNames,
        rowCount,
        relationColumns,
        sampleRows
      });
    }

    const generatedAt = new Date().toISOString();
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Support Event Relation Debugger</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; padding: 24px; background: Canvas; color: CanvasText; }
    h1, h2, h3 { margin: 0 0 12px; }
    p { line-height: 1.5; }
    input, select, button { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid color-mix(in srgb, CanvasText 30%, transparent); background: Canvas; color: CanvasText; }
    button { cursor: pointer; }
    .layout { display: grid; grid-template-columns: minmax(320px, 420px) 1fr; gap: 16px; align-items: start; }
    .panel { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 12px; padding: 16px; background: color-mix(in srgb, Canvas 96%, CanvasText 4%); }
    .controls { display: grid; gap: 8px; margin-bottom: 12px; }
    .muted { opacity: 0.72; }
    .list { max-height: 70vh; overflow: auto; display: grid; gap: 8px; }
    .event-button { text-align: left; border-radius: 10px; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); padding: 10px; background: color-mix(in srgb, Canvas 98%, CanvasText 2%); }
    .event-button:hover, .event-button.active { outline: 2px solid #ff7a00; }
    .title { font-weight: 700; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chip { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: color-mix(in srgb, #6b7cff 20%, Canvas); border: 1px solid color-mix(in srgb, #6b7cff 45%, transparent); }
    .relation { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 10px; margin: 16px 0; }
    .node { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 12px; padding: 12px; background: Canvas; }
    .node strong { display: block; margin-bottom: 6px; }
    pre { overflow: auto; padding: 12px; border-radius: 10px; background: color-mix(in srgb, CanvasText 10%, Canvas); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid color-mix(in srgb, CanvasText 12%, transparent); padding: 6px; text-align: left; vertical-align: top; }
    details { margin-top: 10px; }
    summary { cursor: pointer; font-weight: 700; }
    .table-grid { display: grid; gap: 10px; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .relation { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Support Event Relation Debugger</h1>
  <p class="muted">Generated from <code>${htmlEscape(dbPath)}</code> at ${generatedAt}. This page is a static reverse-engineering aid for inspecting support-card event story rows and nearby master.mdb relations.</p>

  <div class="layout">
    <section class="panel">
      <h2>Support event stories</h2>
      <div class="controls">
        <input id="search" placeholder="Filter by card, character, event title, or story id" />
        <select id="cardFilter"><option value="">All support cards</option></select>
      </div>
      <div id="count" class="muted"></div>
      <div id="eventList" class="list"></div>
    </section>

    <main class="panel">
      <div id="details"></div>
    </main>
  </div>

  <script>
    const events = ${jsonForHtml(events)};
    const relatedTables = ${jsonForHtml(relatedTables)};

    const search = document.getElementById('search');
    const cardFilter = document.getElementById('cardFilter');
    const eventList = document.getElementById('eventList');
    const details = document.getElementById('details');
    const count = document.getElementById('count');
    let selectedStoryId = 830028003;

    const cards = Array.from(new Map(events.map(event => [event.supportCardId, event])).values())
      .sort((a, b) => a.supportCardId - b.supportCardId);

    for (const card of cards) {
      const option = document.createElement('option');
      option.value = String(card.supportCardId);
      option.textContent = card.supportCardId + ' — ' + card.supportCardName + ' ' + card.charaName;
      cardFilter.append(option);
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function matches(event) {
      const query = search.value.trim().toLowerCase();
      const card = cardFilter.value;
      if (card && String(event.supportCardId) !== card) return false;
      if (!query) return true;
      return [
        event.supportCardId,
        event.supportCardName,
        event.charaId,
        event.charaName,
        event.storyId,
        event.storyTitle,
        event.conclusionId
      ].some(value => String(value ?? '').toLowerCase().includes(query));
    }

    function renderList() {
      const filtered = events.filter(matches);
      count.textContent = filtered.length + ' / ' + events.length + ' support event story rows';
      eventList.innerHTML = '';

      for (const event of filtered) {
        const button = document.createElement('button');
        button.className = 'event-button' + (event.storyId === selectedStoryId ? ' active' : '');
        button.innerHTML =
          '<div class="title">' + escapeHtml(event.storyTitle || '(untitled)') + '</div>' +
          '<div>' + escapeHtml(event.supportCardName) + ' ' + escapeHtml(event.charaName) + '</div>' +
          '<div class="chips">' +
            '<span class="chip">story ' + event.storyId + '</span>' +
            '<span class="chip">card ' + event.supportCardId + '</span>' +
            '<span class="chip">progress ' + event.showProgress1 + '/' + event.showProgress2 + '/' + event.showProgress3 + '</span>' +
          '</div>';
        button.addEventListener('click', () => {
          selectedStoryId = event.storyId;
          render();
        });
        eventList.append(button);
      }
    }

    function rowsMentioningEvent(table, event) {
      return table.sampleRows.filter(row => Object.values(row).some(value =>
        value === event.storyId || value === event.supportCardId || value === event.charaId
      ));
    }

    function renderDetails() {
      const event = events.find(item => item.storyId === selectedStoryId) ?? events[0];
      if (!event) {
        details.innerHTML = '<p>No support event rows found.</p>';
        return;
      }

      const relatedSampleTables = relatedTables
        .map(table => ({ ...table, hits: rowsMentioningEvent(table, event) }))
        .filter(table => table.hits.length > 0);

      const sampleTableHtml = relatedSampleTables.length
        ? relatedSampleTables.map(table =>
          '<details open>' +
            '<summary>' + escapeHtml(table.table) + '</summary>' +
            '<pre>' + escapeHtml(JSON.stringify(table.hits, null, 2)) + '</pre>' +
          '</details>'
        ).join('')
        : '<p>No embedded sample rows mention the selected ids.</p>';

      const tableInventoryHtml = relatedTables.map(table =>
        '<details>' +
          '<summary>' + escapeHtml(table.table) + ' (' + table.rowCount + ' rows)</summary>' +
          '<p><b>Relation-looking columns:</b> ' + table.relationColumns.map(escapeHtml).join(', ') + '</p>' +
          '<p><b>All columns:</b> ' + table.columns.map(escapeHtml).join(', ') + '</p>' +
          '<pre>' + escapeHtml(JSON.stringify(table.sampleRows, null, 2)) + '</pre>' +
        '</details>'
      ).join('');

      details.innerHTML =
        '<h2>' + escapeHtml(event.storyTitle || '(untitled)') + '</h2>' +
        '<p class="muted">Selected support event story and direct joins currently visible in master.mdb.</p>' +
        '<div class="relation">' +
          '<div class="node"><strong>support_card_data</strong>' +
            '<div>id: <code>' + event.supportCardId + '</code></div>' +
            '<div>name: ' + escapeHtml(event.supportCardName) + '</div>' +
            '<div>chara: ' + event.charaId + ' — ' + escapeHtml(event.charaName) + '</div>' +
          '</div>' +
          '<div class="node"><strong>single_mode_story_data</strong>' +
            '<div>story_id: <code>' + event.storyId + '</code></div>' +
            '<div>support_card_id: <code>' + event.supportCardId + '</code></div>' +
            '<div>show_progress: ' + event.showProgress1 + '/' + event.showProgress2 + '/' + event.showProgress3 + '</div>' +
          '</div>' +
          '<div class="node"><strong>text_data category 181</strong>' +
            '<div>index: <code>' + event.storyId + '</code></div>' +
            '<div>text: ' + escapeHtml(event.storyTitle) + '</div>' +
          '</div>' +
          '<div class="node"><strong>single_mode_conclusion_set</strong>' +
            '<div>root_id: <code>' + (event.conclusionRootId ?? '(none)') + '</code></div>' +
            '<div>conclusion_id: <code>' + (event.conclusionId ?? '(none)') + '</code></div>' +
          '</div>' +
          '<div class="node"><strong>single_mode_event_production</strong>' +
            '<div>category: <code>' + (event.productionCategoryId ?? '(none)') + '</code></div>' +
            '<div>dir: ' + escapeHtml(event.productionItemDir ?? '') + '</div>' +
            '<div>item: ' + escapeHtml(event.productionItemName ?? '') + '</div>' +
          '</div>' +
          '<div class="node"><strong>single_mode_story_guide</strong>' +
            '<div>guide_id: <code>' + (event.guideId ?? '(none)') + '</code></div>' +
          '</div>' +
        '</div>' +
        '<h3>Raw selected row</h3>' +
        '<pre>' + escapeHtml(JSON.stringify(event, null, 2)) + '</pre>' +
        '<h3>Related table samples that mention selected ids</h3>' +
        '<p class="muted">This section searches the embedded samples for the selected <code>storyId</code>, <code>supportCardId</code>, or <code>charaId</code>. Use the table inventory below for schema-level exploration.</p>' +
        sampleTableHtml +
        '<h3>Relation-oriented table inventory</h3>' +
        '<div class="table-grid">' + tableInventoryHtml + '</div>';
    }

    function render() {
      renderList();
      renderDetails();
    }

    search.addEventListener('input', render);
    cardFilter.addEventListener('change', render);
    render();
  </script>
</body>
</html>
`;

    await Bun.write(OUTPUT_PATH, html);
    console.log(`Wrote ${OUTPUT_PATH}`);
    console.log(
      `Embedded ${events.length} support event rows and ${relatedTables.length} relation-oriented tables`
    );
  } finally {
    closeDatabase(db);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
