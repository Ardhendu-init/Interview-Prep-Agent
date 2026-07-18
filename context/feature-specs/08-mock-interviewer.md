### Mock Interviewer

`lib/ai/mock-interviewer.ts`. Third agentic step, and the clearest proof of
adaptive multi-step behavior for hackathon judging — the model's next question
must depend on the quality of the previous answer, not follow a fixed script.

**Function signature**

```ts
export async function interviewTurn(
  input: ResearchInput,
  guide: PrepGuide,
  history: InterviewTurn[]
): Promise<string>
```

Returns the interviewer's next message as plain text. On failure, returns a
graceful in-character fallback string (e.g. `"Sorry, let's pick this back up —
can you repeat or rephrase your last answer?"`) rather than throwing — a
mid-interview crash is a worse experience than a slightly awkward recovery line.

**Statelessness**

- This function does not read or write the database. The full turn history is
  passed in on every call; the calling Server Action (see
  `10-server-actions-interview.md`) is responsible for persisting each new turn
  both before and after calling this function.

**Model**

- Calls `generateContentLite` (`LITE_MODEL`, i.e. `gpt-5.4-mini`) from
  `client.ts`, not `generateContent`/`MODEL`. One interview turn = one call,
  and cost compounds fast across a multi-turn session — routing straight to
  `LITE_MODEL` keeps interview volume off the pricier tier that
  research/guide generation use, while still using a model capable of real
  reasoning about answer quality (not the smaller `gpt-5.4-nano` tier, which
  is sized for classification/completion, not judgment calls).

**System prompt — required content**

Must instruct the model to:
1. Role-play as an interviewer for the specific role/company from `input`
2. Have access to the guide's concept list and full question bank as context to
   draw from
3. Ask exactly one question per turn
4. After the candidate's answer, give brief (1-2 sentence) feedback, then choose
   the next question based on how strong the answer was: probe deeper on the
   same topic if shallow, move to a new topic/category if strong
5. Mix categories across the conversation — not all-technical or all-behavioral
   back to back
6. Keep its own turns short, simulating real interview pacing, not writing an
   essay
7. On the first turn (empty `history`), skip feedback and just ask an opening
   question

**Verify**

- One deliberately shallow answer and one deliberately strong answer in the
  same session must produce visibly different follow-up approaches

**Status: done** — see `progress-tracker.md` for verification detail and the
one open item (full shallow-vs-strong divergence check blocked by daily API
quota, same constraint as `07-guide-generator.md`).
