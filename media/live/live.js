/* Tangerine Live — render source-linked headlines, without HTML injection. */
"use strict";
const endpoint = "./stories.json";
let edition = null, topic = "All";
const $ = id => document.getElementById(id);
const allowed = new Set(["World","Business","Technology","Science","Culture"]);

function safeLink(raw) {
  try { const url = new URL(raw); return url.protocol === "https:" ? url.href : null; }
  catch (_) { return null; }
}
function displayTime(raw) {
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "TIME UNAVAILABLE";
  return new Intl.DateTimeFormat("en-US", {
    month:"short", day:"numeric", hour:"numeric", minute:"2-digit",
    timeZone:"America/New_York"
  }).format(date).toUpperCase() + " ET";
}
function element(tag, css, value) {
  const node = document.createElement(tag);
  if (css) node.className = css;
  if (value != null) node.textContent = value;
  return node;
}
function link(story, css = "") {
  const node = element("a", css, String(story.title || ""));
  node.href = safeLink(story.url) || "#";
  node.rel = "noopener noreferrer";
  node.target = "_blank";
  return node;
}
function metadata(story) {
  return [story.category, story.source, displayTime(story.published_at)]
    .map(value => String(value || "").toUpperCase()).join(" / ");
}
function storyNode(story) {
  const article = element("article", "story");
  article.append(element("p", "meta", metadata(story)));
  const h2 = element("h2");
  h2.append(link(story));
  article.append(h2);
  const sourceLink = link(story, "source");
  sourceLink.textContent = "READ AT " + String(story.source).toUpperCase() + " ↗";
  article.append(sourceLink);
  return article;
}
function render() {
  const items = edition && Array.isArray(edition.stories) ?
    edition.stories.filter(s => allowed.has(s.category) && safeLink(s.url) && String(s.title || "").trim()) : [];
  const shown = topic === "All" ? items : items.filter(s => s.category === topic);
  const lead = $("lead"), list = $("story-list");
  lead.replaceChildren();
  list.replaceChildren();
  $("story-count").textContent = String(shown.length);
  $("feed-count").textContent = String(edition ? edition.source_count || 0 : 0);
  $("view-count").textContent = shown.length + " STORIES / " + topic.toUpperCase();
  if (!shown.length) {
    lead.append(element("p", "placeholder", edition && edition.generated_at ?
      "No recent headlines in this category." : "Awaiting the first successful feed update."));
    return;
  }
  lead.append(link(shown[0]), element("p", "meta", metadata(shown[0])));
  for (const story of shown.slice(1)) list.append(storyNode(story));
  if (shown.length === 1) list.append(element("p", "placeholder", "You're up to date in this category."));
}
function updateStatus(error = false) {
  const status = $("feed-status");
  if (!edition || !edition.generated_at) {
    status.textContent = error ? "FEED UNAVAILABLE / NO EDITION LOADED" : "AWAITING FIRST SCHEDULED REFRESH";
    status.classList.toggle("is-stale", error);
    return;
  }
  const date = new Date(edition.generated_at);
  const age = Date.now() - date.getTime();
  const stale = error || !Number.isFinite(age) || age > 6 * 3600 * 1000;
  status.classList.toggle("is-stale", stale);
  status.textContent = (stale ? "LAST AVAILABLE EDITION / " : "UPDATED / ") +
    displayTime(edition.generated_at) + (stale ? " / MAY BE STALE" : "");
}
async function refresh() {
  $("reload").disabled = true;
  try {
    const response = await fetch(endpoint, {cache:"no-store"});
    if (!response.ok) throw new Error("data unavailable");
    const data = await response.json();
    if (!data || !Array.isArray(data.stories)) throw new Error("invalid feed");
    edition = data;
    render();
    updateStatus();
  } catch (_) { updateStatus(true); }
  finally { $("reload").disabled = false; }
}
$("filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-category]");
  if (!button || !(allowed.has(button.dataset.category) || button.dataset.category === "All")) return;
  topic = button.dataset.category;
  for (const choice of $("filters").querySelectorAll("button"))
    choice.setAttribute("aria-pressed", String(choice === button));
  render();
});
$("reload").addEventListener("click", refresh);
refresh();
setInterval(refresh, 5 * 60 * 1000);
