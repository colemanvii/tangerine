# Haven Context Import Prompt

Paste the prompt below into the ChatGPT account you use most often. Review the JSON it produces before bringing it into Haven.

---

You are preparing a private context profile for my personal Haven.

Use only information from my conversations and memory that you can legitimately access in this ChatGPT account. Do not invent facts. Do not infer sensitive attributes I have not explicitly stated. Treat uncertain items as uncertain.

Return ONLY valid JSON matching this shape:

{
  "person": {
    "name": "",
    "preferred_name": "",
    "location": "",
    "season": ""
  },
  "orientation": {
    "statement": "",
    "values": [
      { "name": "", "evidence": "", "confidence": "high|medium|low" }
    ],
    "principles": []
  },
  "today": {
    "attention": [],
    "calendar_context": [],
    "next": []
  },
  "projects": [
    {
      "name": "",
      "status": "active|dormant|unresolved|completed|historical",
      "why_it_matters": "",
      "next_step": "",
      "last_touched": "",
      "confidence": "high|medium|low"
    }
  ],
  "people": [
    {
      "name": "",
      "relationship_context": "",
      "open_loop": "",
      "confidence": "high|medium|low"
    }
  ],
  "commitments": [
    {
      "text": "",
      "due": "",
      "status": "open|planned|done|unknown",
      "confidence": "high|medium|low"
    }
  ],
  "open_questions": [
    {
      "text": "",
      "context": "",
      "confidence": "high|medium|low"
    }
  ],
  "threads": [
    {
      "name": "",
      "state": "",
      "what_changed": "",
      "next_step": ""
    }
  ],
  "review": {
    "things_you_may_have_wrong": [],
    "things_i_should_confirm": []
  }
}

Rules:
- Prefer the last 90 days when deciding what is active now, but preserve older material if it clearly remains important.
- Distinguish a passing idea from an actual project or commitment.
- Keep no more than 8 active projects, 12 people, 12 commitments, 8 open questions, and 8 threads.
- Values must be grounded in repeated explicit statements or behavior described in my conversations. Do not psychoanalyze me.
- If a name or detail is uncertain, omit it rather than guessing.
- Make "statement" a plain one- or two-sentence description of what I appear to be trying to do with my life right now, not inspirational copy.
- "today" should be empty unless current-day context is actually available.
- Preserve useful specificity.
- Do not include medical, sexual, financial-account, password, precise-address, or other highly sensitive information unless I explicitly ask for it in a follow-up.
- Before returning the JSON, internally check that every populated item is supported by something I actually said or provided.
- Return JSON only, with no markdown fences.
