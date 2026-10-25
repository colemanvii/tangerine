import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const declarations = source.split('el("openButton").addEventListener')[0];
assert.notEqual(declarations, source, "Expected identifiable browser bootstrap boundary");
const sandbox = {};
runInNewContext(declarations + "\nglobalThis.api = {parseExport,bucketFor,sessionEstimate,recurringWords};", sandbox);
const {parseExport,bucketFor,sessionEstimate,recurringWords} = sandbox.api;

test("ChatGPT export respects the current conversation path", () => {
  const parsed=parseExport([{
    id:"one", title:"Original text", current_node:"answer",
    mapping:{
      prompt:{parent:null,message:{author:{role:"user"},create_time:1790000000,content:{parts:["I wrote this."]}}},
      answer:{parent:"prompt",message:{author:{role:"assistant"},create_time:1790000001,content:{parts:["Response."]}}},
      alternate:{parent:"prompt",message:{author:{role:"assistant"},create_time:1790000002,content:{parts:["Unused alternative."]}}}
    }
  }]);
  assert.equal(parsed.conversations.length,1);
  assert.equal(parsed.conversations[0].messages.length,2);
  assert.equal(parsed.conversations[0].messages[0].text,"I wrote this.");
  assert.equal(parsed.withTimestamp,2);
});

test("activity buckets cover a rolling 365 calendar days, including the first partial month", () => {
  const now=new Date(2026,9,25,12,0,0);
  const cutoff=new Date(2025,9,26,12,0,0).getTime();
  const series=bucketFor(365,[{t:cutoff},{t:now.getTime()}],now).buckets;
  assert.equal(series.length,13);
  assert.equal(series[0].key,"2025-10");
  assert.equal(series[series.length-1].key,"2026-10");
  assert.equal(series[0].count,1);
  assert.equal(series[series.length-1].count,1);
});

test("7 day buckets are calendar days including today", () => {
  const now=new Date(2026,9,25,12,0,0);
  const series=bucketFor(7,[],now).buckets;
  assert.equal(series.length,7);
  assert.equal(series[0].key,"2026-10-19");
  assert.equal(series[6].key,"2026-10-25");
});

test("session estimate splits at a 30 minute gap and caps individual intervals", () => {
  const result=sessionEstimate([{t:1000},{t:1000+1500000},{t:1000+1500000+1800001}]);
  assert.equal(result.sessions,2);
  assert.equal(result.minutes,7);
});

test("word frequencies read human text without inventing semantic topics", () => {
  const words=recurringWords([{text:"Sketch sketch garden. Make the garden."}]);
  assert.equal(words[0][0],"garden");
  assert.equal(words[0][1],2);
  assert.ok(words.some(([word,count])=>word==="sketch"&&count===2));
});
