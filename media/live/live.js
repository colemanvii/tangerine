/* Tangerine / The Feed: original publisher headlines, rendered as text, not HTML. */
"use strict";
const API = "/api/headlines";
const SNAPSHOT = "./stories.json";
const CATEGORIES = new Set(["World","Business","Technology","Science","Culture"]);
const byId = id => document.getElementById(id);
let edition = null;
let selected = "All";
let lastError = false;

function textNode(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = value;
  return node;
}
function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch (_) { return null; }
}
function sourceLink(story, label) {
  const anchor = textNode("a", "", label || String(story.title || ""));
  anchor.href = safeUrl(story.url) || "#";
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}
function dateLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return "TIME UNKNOWN";
  return new Intl.DateTimeFormat("en-US", {
    month:"short", day:"numeric", hour:"numeric", minute:"2-digit",
    timeZone:"America/New_York"
  }).format(date).toUpperCase() + " ET";
}
function localDay() {
  return new Intl.DateTimeFormat("en-US", {
    weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"America/New_York"
  }).format(new Date()).toUpperCase();
}
function metadata(story) {
  return [story.source, dateLabel(story.published_at)].join(" · ").toUpperCase();
}
function clear(id) {
  const root = byId(id);
  root.replaceChildren();
  return root;
}
function createHeadline(story, className = "") {
  const heading = textNode("h3", className);
  heading.append(sourceLink(story));
  return heading;
}
function buildLead(story) {
  const node = textNode("article", "lead-story");
  node.append(textNode("p","story-category", String(story.category).toUpperCase() + " / MOST RECENT"));
  const headline = textNode("h2");
  headline.append(sourceLink(story));
  node.append(headline);
  node.append(textNode("p","story-meta",metadata(story)));
  return node;
}
function buildSecondary(story) {
  const node = textNode("article","support");
  node.append(textNode("p","story-category",String(story.category).toUpperCase()));
  node.append(createHeadline(story));
  node.append(textNode("p","story-meta",metadata(story)));
  return node;
}
function buildQuick(story, index) {
  const node = textNode("article","quick");
  node.append(textNode("p","quick-num",String(index + 1).padStart(2,"0") + " / " + String(story.category).toUpperCase()));
  node.append(createHeadline(story));
  node.append(textNode("p","story-meta",metadata(story)));
  return node;
}
function buildStory(story) {
  const node = textNode("article","story");
  node.append(textNode("p","story-category",String(story.category).toUpperCase()));
  node.append(createHeadline(story));
  node.append(textNode("p","story-meta",metadata(story)));
  const link = sourceLink(story, "READ ORIGINAL REPORTING ↗");
  link.className = "source-link";
  node.append(link);
  return node;
}
function validStories() {
  const rows = edition && Array.isArray(edition.stories) ? edition.stories : [];
  const seen = new Set();
  return rows.filter(s => {
    if (!s || !CATEGORIES.has(s.category) || !safeUrl(s.url) || !String(s.title || "").trim()) return false;
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return selected === "All" || s.category === selected;
  });
}
function render() {
  const stories = validStories();
  const lead = clear("lead");
  const secondary = clear("secondary");
  const justIn = clear("just-in");
  const list = clear("story-list");
  const empty = byId("no-stories");
  empty.hidden = true;

  byId("front-label").textContent = selected === "All" ? "LATEST / ACROSS THE WORLD" : selected.toUpperCase() + " / LATEST";
  byId("story-total").textContent = stories.length + " STORIES IN THIS EDITION";
  byId("coverage").textContent = "COVERAGE / " + (edition ? edition.source_count || 0 : 0) + " PUBLISHER FEEDS";

  if (!stories.length) {
    lead.append(textNode("p","loading-line",
      edition ? "No recent stories in this section." :
      "Live headlines are temporarily unavailable."));
    justIn.append(textNode("p","quiet","No recent items can be shown."));
    empty.textContent = "You can still explore the original publishers through the source desk below.";
    empty.hidden = false;
    return;
  }
  lead.append(buildLead(stories[0]));
  const supporting = stories.slice(1,3);
  for (const story of supporting) secondary.append(buildSecondary(story));
  const justNow = stories.slice(3,8);
  for (const [i, story] of justNow.entries()) justIn.append(buildQuick(story,i));
  if (!justNow.length) justIn.append(textNode("p","quiet","No other stories in this section yet."));
  for (const story of stories.slice(8)) list.append(buildStory(story));
  if (stories.length <= 8) {
    empty.textContent = "These are all the current headlines for this selection.";
    empty.hidden = false;
  }
}
function status() {
  const node = byId("feed-status");
  const time = byId("edition-time");
  if (!edition || !edition.generated_at) {
    node.textContent = "● SOURCE FEED UNAVAILABLE";
    node.style.color = "#9a390c";
    time.textContent = "ORIGINAL PUBLISHERS LINKED BELOW";
    return;
  }
  const age = Date.now() - new Date(edition.generated_at).getTime();
  const stale = lastError || !Number.isFinite(age) || age > 60 * 60 * 1000;
  node.textContent = stale ? "● LAST AVAILABLE EDITION" : "● SOURCES CONNECTED";
  node.style.color = stale ? "#9a390c" : "#11110f";
  time.textContent = (stale ? "POSSIBLY STALE / " : "UPDATED / ") + dateLabel(edition.generated_at);
}
async function request(url) {
  const response = await fetch(url, {cache:"no-store"});
  if (!response.ok) throw new Error("news source unavailable");
  const body = await response.json();
  if (!body || !Array.isArray(body.stories) || body.stories.length === 0) throw new Error("empty edition");
  return body;
}
async function refresh() {
  byId("refresh").disabled = true;
  try {
    edition = await request(API);
    lastError = false;
  } catch (_) {
    lastError = true;
    if (!edition) {
      try { edition = await request(SNAPSHOT); }
      catch (_) { edition = null; }
    }
  } finally {
    render();
    status();
    byId("refresh").disabled = false;
  }
}
byId("today").textContent = localDay();
byId("filters").addEventListener("click", e => {
  const button = e.target.closest("button[data-category]");
  if (!button || !(button.dataset.category === "All" || CATEGORIES.has(button.dataset.category))) return;
  selected = button.dataset.category;
  for (const control of byId("filters").querySelectorAll("button"))
    control.setAttribute("aria-pressed",String(control === button));
  render();
});
byId("refresh").addEventListener("click",refresh);
refresh();
setInterval(refresh, 7 * 60 * 1000);
