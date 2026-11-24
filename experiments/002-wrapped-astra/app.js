"use strict";

// Tangerine Wrapped 001 — local-only, source-grounded analysis.
// Never persist or transmit the imported file. Never present an estimate as screen time.
const DAY = 86400000;
const state = { data: null, mode: null, days: 365 };
const el = id => document.getElementById(id);
const formatInt = n => new Intl.NumberFormat("en-US").format(n);
const monthName = d => d.toLocaleDateString("en-US", { month: "short" });
const longDay = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const pad = n => String(n).padStart(2, "0");
const dateKey = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
const monthKey = d => d.getFullYear() + "-" + pad(d.getMonth()+1);

function toTime(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e11 ? value : value * 1000;
  }
  if (typeof value === "string") {
    const result = Date.parse(value);
    return Number.isFinite(result) ? result : null;
  }
  return null;
}

function plainText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content.text === "string") return content.text;
  if (Array.isArray(content.parts)) {
    return content.parts.map(part => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    }).join(" ");
  }
  return "";
}

function normalizeMessage(m) {
  if (!m || typeof m !== "object") return null;
  const role = (m.author && m.author.role) || m.role || "unknown";
  return {
    role: String(role),
    t: toTime(m.create_time ?? m.timestamp ?? m.created_at),
    text: plainText(m.content)
  };
}

function activePathMessages(conversation) {
  if (conversation.mapping && typeof conversation.mapping === "object") {
    const mapping = conversation.mapping;
    if (conversation.current_node && mapping[conversation.current_node]) {
      const chain = [], seen = new Set();
      let nodeId = conversation.current_node;
      while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
        seen.add(nodeId);
        const node = mapping[nodeId];
        if (node.message) chain.push(node.message);
        nodeId = node.parent || null;
      }
      return chain.reverse();
    }
    // A missing current_node makes a branch-precise count impossible.
    // Count unique mapping nodes once rather than guessing an active branch.
    return Object.values(mapping).map(node => node && node.message).filter(Boolean);
  }
  if (Array.isArray(conversation.messages)) return conversation.messages;
  return [];
}

function parseExport(raw) {
  const items = Array.isArray(raw) ? raw :
    (raw && Array.isArray(raw.conversations) ? raw.conversations : null);
  if (!items) {
    throw new Error("This file does not look like a ChatGPT conversations.json export. Expected an array of conversations.");
  }
  let noTimestamp = 0, withTimestamp = 0, withoutActivePath = 0;
  const conversations = [];
  for (let i = 0; i < items.length; i++) {
    const original = items[i];
    if (!original || typeof original !== "object") continue;
    if (original.mapping && !original.current_node) withoutActivePath++;
    const parsed = activePathMessages(original).map(normalizeMessage).filter(Boolean);
    noTimestamp += parsed.filter(m => m.t === null).length;
    withTimestamp += parsed.filter(m => m.t !== null).length;
    const usable = parsed.filter(m => m.t !== null && (m.role === "user" || m.role === "assistant"));
    if (usable.length === 0) continue;
    conversations.push({
      id: String(original.id || i),
      title: typeof original.title === "string" && original.title.trim() ? original.title.trim() : "Untitled conversation",
      messages: usable
    });
  }
  if (!conversations.length) throw new Error("No dated conversation messages could be read. Check that the file is the original conversations.json export.");
  return { conversations, noTimestamp, withTimestamp, withoutActivePath, sourceCount: items.length };
}

function demo() {
  const titles = [
    "Sketching a small garden", "Notes on a painting", "Learning a song",
    "Books worth returning to", "Building a personal website", "Weekend photographs",
    "Making a wooden shelf", "A letter to a friend", "The shape of an idea",
    "A study of light", "Organizing an archive", "A quieter morning"
  ];
  const lines = [
    "I want to sketch the garden and think about how light falls in the morning.",
    "Can you help me organize these painting notes without rewriting the original?",
    "I'm learning this song and want to keep the music close to my daily life.",
    "I found a passage in a book that I want to return to later.",
    "I'd like to finish a website and share a real project with friends.",
    "I took some photographs this weekend and want to select the best work."
  ];
  const now = Date.now();
  const conversations = Array.from({length: 42}, (_, i) => {
    const base = now - (2 + i * 8 + (i % 5)) * DAY;
    const messages = [];
    for (let j = 0; j < 4 + (i % 11); j++) {
      const t = base + j * 240000;
      messages.push({ role: "user", t, text: lines[(i + j) % lines.length] });
      messages.push({ role: "assistant", t: t + 30000, text: "This is a fictional demo response, not a real ChatGPT exchange." });
    }
    return { id: "fictional-" + i, title: titles[i % titles.length], messages };
  });
  return { conversations, noTimestamp: 0, withTimestamp: conversations.reduce((n,c) => n + c.messages.length,0), withoutActivePath: 0, sourceCount: conversations.length };
}

function bucketFor(days, messages, now) {
  const buckets = [];
  if (days === 365) {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
    const first = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 14; i++) {
      const day = new Date(first.getFullYear(), first.getMonth() + i, 1);
      if (day > end) break;
      buckets.push({ key: monthKey(day), label: monthName(day), count: 0 });
    }
    const byKey = new Map(buckets.map(b => [b.key, b]));
    for (const m of messages) {
      const b = byKey.get(monthKey(new Date(m.t)));
      if (b) b.count++;
    }
    return {buckets, title: "ACTIVITY BY MONTH", unit: "YOUR MESSAGES"};
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    buckets.push({key: dateKey(day), label: days === 7 ? day.toLocaleDateString("en-US",{weekday:"short"}) : String(day.getDate()), count: 0});
  }
  const byKey = new Map(buckets.map(b => [b.key, b]));
  for (const m of messages) {
    const b = byKey.get(dateKey(new Date(m.t)));
    if (b) b.count++;
  }
  return {buckets, title: "ACTIVITY BY DAY", unit: "YOUR MESSAGES"};
}

function sessionEstimate(messages) {
  // Consecutive exported message timestamps do not prove time on screen.
  // A one-minute session start + gap durations capped at five minutes are only a proxy.
  const sorted = messages.slice().sort((a,b) => a.t-b.t);
  let sessions = 0, seconds = 0, previous = null;
  for (const m of sorted) {
    if (previous === null || m.t - previous > 30*60000 || m.t < previous) {
      sessions++;
      seconds += 60;
    } else {
      seconds += Math.min((m.t - previous) / 1000, 300);
    }
    previous = m.t;
  }
  return {sessions, minutes: Math.round(seconds/60)};
}

function timeLabel(minutes) {
  if (minutes < 60) return formatInt(minutes) + "m";
  const hours = minutes/60;
  return (hours >= 100 ? Math.round(hours) : Math.round(hours*10)/10).toLocaleString("en-US") + "h";
}

const STOP = new Set(("about after again also always another because before being between could doing every first from going great have here into just know like make many more much need only other over really should some something still than that their them there these thing things think this those through today tomorrow want what when where which while with would your youre said then into even been each does dont didnt isn't it's").split(/\s+/));
function recurringWords(messages) {
  const frequencies = new Map();
  for (const m of messages) {
    const words = (m.text.toLowerCase().match(/[a-z][a-z']{3,}/g) || []);
    for (const word of words) {
      const cleaned = word.replace(/'/g, "");
      if (!STOP.has(cleaned) && cleaned.length >= 4) frequencies.set(cleaned,(frequencies.get(cleaned)||0)+1);
    }
  }
  return [...frequencies.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,7);
}

function setText(id, value) { el(id).textContent = value; }
function clearChildren(element) { element.replaceChildren(); }
function node(tag, className, content) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (content !== undefined) item.textContent = String(content);
  return item;
}

function renderChart(buckets, days) {
  const chart = el("activityChart");
  clearChildren(chart);
  const max = Math.max(1,...buckets.map(b=>b.count));
  const top = Math.max(...buckets.map(b=>b.count));
  buckets.forEach((b,i) => {
    const col = node("div", "bar-column"+(b.count===top && top>0?" top":"")+(days===30?" dense":""));
    const bar = node("div", "bar-fill");
    bar.style.setProperty("--height", Math.max(0.5,(b.count/max)*100)+"%");
    col.append(bar);
    // Date labels are intentionally sparse at 30-day width.
    if (days !== 30 || i % 5 === 0 || i===buckets.length-1) col.append(node("span","bar-label",b.label));
    col.title = b.key + ": " + b.count + " human messages";
    chart.append(col);
  });
}

function renderWords(words) {
  const list=el("wordsList");
  clearChildren(list);
  if (words.length===0) { list.append(node("p","small-muted","No readable message text in this range.")); return; }
  const max = words[0][1];
  words.forEach(([word,count])=>{
    const row=node("div","word-row");
    row.append(node("span","word-name",word));
    const rail=node("span","word-rail"), fill=node("span","word-fill");
    fill.style.setProperty("--width",(count/max*100).toFixed(2)+"%");
    rail.append(fill);
    row.append(rail,node("span","word-count",count));
    list.append(row);
  });
}

function renderConversations(items) {
  const list=el("conversationList");
  clearChildren(list);
  if (!items.length){ list.append(node("li","small-muted","No conversations in this period."));return; }
  items.forEach(({conversation,count},i)=>{
    const li=node("li"), row=node("div","conversation-item");
    row.append(node("span","rank",String(i+1).padStart(2,"0")));
    row.append(node("span","conversation-title",conversation.title));
    row.append(node("span","conversation-count",formatInt(count)));
    li.append(row);
    list.append(li);
  });
}

function render() {
  const hasData = Boolean(state.data);
  el("empty").hidden=hasData;
  el("report").hidden=!hasData;
  el("clearButton").hidden=!hasData;
  document.querySelectorAll(".range-button").forEach(b => {
    const selected=Number(b.dataset.days)===state.days;
    b.classList.toggle("active",selected);
    b.setAttribute("aria-pressed",selected?"true":"false");
  });
  if(!hasData) return;
  const now = new Date();
  const cutoff=new Date(now.getFullYear(), now.getMonth(), now.getDate()-state.days+1).getTime();
  const inPeriod=t=>t>=cutoff && t<=now.getTime();
  const conversationCounts=[];
  const all=[];
  const user=[];
  const dates=new Map();
  for (const c of state.data.conversations) {
    const within = c.messages.filter(m => inPeriod(m.t));
    const human = within.filter(m => m.role==="user");
    if (!human.length) continue;
    conversationCounts.push({conversation:c,count:human.length});
    all.push(...within);
    user.push(...human);
    for(const m of human){
      const key=dateKey(new Date(m.t));
      dates.set(key,(dates.get(key)||0)+1);
    }
  }
  const activity=bucketFor(state.days,user,now);
  const sessions=sessionEstimate(all);
  const leading=activity.buckets.slice().sort((a,b)=>b.count-a.count)[0];
  const bestDay=[...dates.entries()].sort((a,b)=>b[1]-a[1])[0];
  const dateFromKey=key=>new Date(key+"T12:00:00");
  const elapsed=new Date(cutoff);
  setText("sourceLabel",state.mode==="demo"?"FICTIONAL DEMO · NOT YOUR DATA":"YOUR CHATGPT EXPORT");
  setText("windowLabel",longDay(elapsed)+" — "+longDay(now));
  setText("messagesValue",formatInt(user.length));
  setText("conversationsValue",formatInt(conversationCounts.length));
  setText("daysValue",formatInt(dates.size));
  setText("timeValue",timeLabel(sessions.minutes));
  setText("activityTitle",activity.title);
  setText("activityUnit",activity.unit);
  renderChart(activity.buckets,state.days);
  setText("activityNote",leading && leading.count ? ("Most messages in this view: "+leading.label+" ("+formatInt(leading.count)+"). Bars represent message counts, not time spent.") : "No human messages recorded in this window.");
  renderWords(recurringWords(user));
  conversationCounts.sort((a,b)=>b.count-a.count || a.conversation.title.localeCompare(b.conversation.title));
  renderConversations(conversationCounts.slice(0,7));
  setText("busiestDay",bestDay?longDay(dateFromKey(bestDay[0]))+" · "+formatInt(bestDay[1]):"—");
  setText("busiestPeriod",leading && leading.count?leading.label+" · "+formatInt(leading.count)+" messages":"—");
  setText("sessionsValue",formatInt(sessions.sessions)+" estimated");
  const total=state.data.withTimestamp+state.data.noTimestamp;
  setText("coverageValue",total?Math.round(state.data.withTimestamp/total*100)+"% dated":"Unknown");
  const caveats=[];
  if (state.mode==="demo") caveats.push("All loaded content is fictional sample data.");
  if (state.data.noTimestamp) caveats.push(formatInt(state.data.noTimestamp)+" imported messages had no usable timestamp.");
  if (state.data.withoutActivePath) caveats.push(formatInt(state.data.withoutActivePath)+" conversations had no active branch pointer; alternative paths may be included.");
  caveats.push("The activity-window calculation adds one minute per session and caps each consecutive message interval at five minutes, splitting sessions at gaps above 30 minutes.");
  setText("reportCaveat",caveats.join(" "));
}

function showError(message) {
  el("error").textContent=message;
  el("error").hidden=false;
}
function clearError() { el("error").hidden=true;el("error").textContent=""; }

el("openButton").addEventListener("click",()=>el("fileInput").click());
el("fileInput").addEventListener("change",async function(){
  if (!this.files || !this.files[0]) return;
  clearError();
  try {
    const raw=JSON.parse(await this.files[0].text());
    const parsed=parseExport(raw);
    state.data=parsed;
    state.mode="import";
    render();
  } catch(error) {
    showError(error instanceof Error?error.message:"The file could not be read.");
  } finally {
    // Clear the input so the same file can be intentionally reselected.
    this.value="";
  }
});
el("demoButton").addEventListener("click",()=>{
  clearError();
  state.data=demo();
  state.mode="demo";
  render();
});
el("clearButton").addEventListener("click",()=>{
  state.data=null;
  state.mode=null;
  clearError();
  render();
});
document.querySelectorAll(".range-button").forEach(button=>{
  button.addEventListener("click",()=>{
    state.days=Number(button.dataset.days);
    render();
  });
});
render();
