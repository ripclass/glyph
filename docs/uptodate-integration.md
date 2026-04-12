# UpToDate Connect API Integration

> Last updated: April 2026

## What Is UpToDate?

[UpToDate](https://www.uptodate.com) is the world's most widely used clinical decision support resource, published by **Wolters Kluwer**. It provides evidence-based, peer-reviewed clinical recommendations for over 12,000 medical topics. Approximately 2 million clinicians in 195 countries use UpToDate, and studies have shown that UpToDate use is associated with improved patient outcomes and reduced hospital stays.

### Why It Matters for Glyph

Bangladeshi doctors -- particularly those in private general practice -- often lack easy access to current clinical evidence during patient encounters. UpToDate access typically requires an institutional subscription costing $500-2,000+ per year, which many independent practitioners cannot justify.

Glyph integrates UpToDate into the clinical workflow so that:

1. **Evidence appears at the point of care**: When a doctor sees a patient with Type 2 Diabetes, relevant UpToDate recommendations (e.g., "Metformin as first-line therapy -- Grade 1A") appear alongside the briefing card and clinical note
2. **AI reasoning is grounded in evidence**: When Claude generates clinical content, UpToDate evidence is used to validate and support recommendations
3. **Doctors learn while they practice**: Each encounter becomes a learning opportunity as doctors see evidence-based recommendations contextualized to their specific patient

---

## UpToDate Connect API

### What It Is

UpToDate Connect is an API provided by Wolters Kluwer that allows third-party applications to embed UpToDate content in clinical workflows. It is distinct from the UpToDate website -- Connect provides structured, machine-readable clinical content.

### API Access

**Wolters Kluwer Developer Program:**
- Apply at: https://developer.wolterskluwer.com
- Program: UpToDate Connect API
- License type: Commercial Integration License
- Review process: 4-8 weeks (Wolters Kluwer reviews the integration for clinical appropriateness)
- Pricing: Per-query pricing model (varies by volume and use case)

**Authentication:**
- API key-based authentication
- Key stored in `UPTODATE_API_KEY` environment variable (Edge Function only, never client-side)
- Base URL: `UPTODATE_BASE_URL` (default: `https://api.connect.uptodate.com`)

### API Capabilities

| Endpoint | Purpose | Use in Glyph |
|---|---|---|
| `GET /search` | Search topics by keyword | Finding relevant topics based on diagnosis or complaint |
| `GET /topics/{id}` | Get full topic content | Retrieving recommendations for display |
| `GET /topics/{id}/recommendations` | Get specific recommendations | Populating the UpToDatePanel component |
| `GET /topics/{id}/drug-info` | Drug-specific information | Cross-referencing prescribed medications |
| `GET /topics/{id}/graphics` | Clinical algorithms and tables | Future: displaying clinical pathways |

---

## Integration Points in Glyph

### 1. Briefing Card Generation

**When**: During `generate-briefing` Edge Function execution
**How**: After Claude generates the initial briefing card, the Edge Function queries UpToDate for topics related to the patient's chief complaint and chronic conditions.

```
Intake data -> Claude generates briefing -> UpToDate query for related topics
                                                    |
                                                    v
                                         Relevant recommendations
                                         appended to briefing card
```

**Example flow:**
1. Patient presents with "increased thirst, frequent urination, blurred vision"
2. Claude identifies likely uncontrolled diabetes
3. UpToDate query: `search?q=type+2+diabetes+treatment`
4. Relevant topic returned: "Type 2 Diabetes Mellitus: Treatment"
5. Key recommendations added to the briefing assessment section:
   - "Metformin as first-line therapy (Grade 1A)"
   - "Target HbA1c < 7% for most patients (Grade 1B)"
   - "Consider SGLT2 inhibitor if eGFR > 25 (Grade 1A)"

### 2. Doctor Research Query

**When**: During `research-query` Edge Function execution (doctor asks a clinical question mid-consultation)
**How**: UpToDate is queried in parallel with Claude and Perplexity. Results are merged and displayed.

```
Doctor query: "Should I continue metformin with creatinine 1.8?"
                    |
          +---------+---------+
          |         |         |
          v         v         v
       Claude    Perplexity   UpToDate
       (reasoning) (search)   (evidence)
          |         |         |
          +---------+---------+
                    |
                    v
          Merged response with citations
```

### 3. Clinical Note Validation

**When**: During `generate-note` Edge Function execution
**How**: After Claude drafts the clinical note, UpToDate is queried to validate key recommendations. If a generated recommendation contradicts UpToDate evidence, the note includes a flagged discrepancy.

**Example**: If Claude recommends a medication that UpToDate flags as contraindicated for the patient's conditions, the note includes a warning annotation.

### 4. Standalone UpToDate Panel

**When**: Doctor manually looks up a topic during consultation
**How**: The UpToDatePanel component (`web/src/components/doctor/UpToDatePanel.tsx`) displays UpToDate content in a dedicated panel.

---

## How Clinical Evidence Is Displayed

### The UpToDatePanel Component

The `UpToDatePanel` renders UpToDate content in a structured, compact format designed for quick scanning during a consultation.

**Visual design:**
- Orange-themed border and accents (`border-orange-200`, `bg-orange-50/50`)
- "UpToDate" badge in the header (orange)
- Evidence grade badges (color-coded by grade)
- "Powered by UpToDate" attribution in the footer
- External link to the full article

**Evidence grade color coding:**

| Grade | Meaning | Color | CSS Class |
|---|---|---|---|
| 1A | Strong recommendation, high-quality evidence | Green | `bg-green-100 text-green-800` |
| 1B | Strong recommendation, moderate-quality evidence | Light green | `bg-green-50 text-green-700` |
| 1C | Strong recommendation, low-quality evidence | Lime | `bg-lime-100 text-lime-800` |
| 2A | Weak recommendation, high-quality evidence | Amber | `bg-amber-100 text-amber-800` |
| 2B | Weak recommendation, moderate-quality evidence | Light amber | `bg-amber-50 text-amber-700` |
| 2C | Weak recommendation, low-quality evidence | Orange | `bg-orange-100 text-orange-800` |

**Example panel rendering:**

```
+----------------------------------------------------+
| Type 2 Diabetes Mellitus: Treatment     [UpToDate] |
| Last updated: March 2026                           |
+----------------------------------------------------+
| KEY RECOMMENDATIONS                                |
|                                                    |
| [1A] Metformin as first-line therapy for           |
|      most patients with T2DM                       |
|                                                    |
| [1B] Consider GLP-1 RA or SGLT2 inhibitor         |
|      for patients with established ASCVD           |
|                                                    |
| [2A] Individualize HbA1c target based on           |
|      patient age, comorbidities, and               |
|      hypoglycemia risk                             |
+----------------------------------------------------+
| Powered by UpToDate(R)     [View full article ->]  |
+----------------------------------------------------+
```

### Integration with Source Tags

When UpToDate evidence supports a claim in the briefing card or clinical note, the claim receives an orange `SourceTag`:

```
[1A] Metformin recommended as first-line   [UpToDate]
```

Tapping the "UpToDate" tag opens the LinkedEvidence panel showing:
- The specific UpToDate recommendation text
- The evidence grade and what it means
- The topic title and last updated date
- A link to the full UpToDate article

---

## Attribution and Licensing Requirements

### Wolters Kluwer Requirements

The UpToDate Connect license includes specific attribution requirements:

1. **"Powered by UpToDate" attribution**: Must appear wherever UpToDate content is displayed. Implemented in the UpToDatePanel footer.

2. **Evidence grade display**: When displaying recommendations, the evidence grade (GRADE system) must be shown. Implemented as color-coded badges.

3. **No content modification**: UpToDate recommendation text must be displayed as provided by the API, without modification or paraphrasing. The text in `UpToDateRecommendation.text` is rendered verbatim.

4. **Link to full article**: When available, a link to the full UpToDate article must be provided. Implemented as "View full article" in the panel footer.

5. **No offline caching of content**: UpToDate content must be fetched from the API for each display, not cached client-side for extended periods. Edge Function responses may be cached for up to 1 hour.

6. **Usage reporting**: API usage must be reportable to Wolters Kluwer. Logged in `api_usage_log` with `edge_function = 'uptodate-lookup'`.

### Glyph's AI + UpToDate Attribution

When Claude's AI reasoning incorporates UpToDate evidence:

- The AI-generated text is attributed to the AI model (e.g., via a general SourceTag)
- The specific UpToDate evidence supporting the reasoning is attributed separately to UpToDate
- These are visually distinct: AI reasoning appears in the main briefing/note text, while UpToDate evidence appears in the UpToDatePanel or as orange-tagged evidence items

This ensures that:
- Doctors know which content is AI-generated reasoning vs. peer-reviewed evidence
- Wolters Kluwer's content is properly attributed
- The doctor can independently verify the AI's reasoning against the source evidence

---

## Fallback When UpToDate Is Unavailable

UpToDate may be unavailable due to:
- API rate limiting
- Service downtime
- Network connectivity issues
- License/quota exhaustion
- Specific topic not found in UpToDate's database

### Fallback Strategy

```
UpToDate API query
        |
  +-----+-----+
  |             |
  v             v
Success       Failure
  |             |
  v             v
Display       Fallback to:
UpToDate      1. Perplexity (medical search)
Panel         2. PubMed API (free)
              3. Claude training knowledge
              4. "No evidence available" message
```

**Fallback sources:**

| Fallback | Source | Evidence Quality | Attribution |
|---|---|---|---|
| 1st: Perplexity | Real-time web search focused on medical sources | Moderate (unverified) | Gray "Perplexity" SourceTag |
| 2nd: PubMed API | National Library of Medicine database | High (peer-reviewed) | Gray "PubMed" SourceTag |
| 3rd: Claude knowledge | Model training data | Variable (may be outdated) | No evidence tag (AI reasoning only) |
| 4th: No evidence | - | - | "Clinical evidence unavailable for this query" message |

**Visual indication**: When UpToDate is unavailable and a fallback source is used, the panel header changes from "UpToDate" to the fallback source name, and the border color changes from orange to gray.

---

## Configuration

### Environment Variables

```env
UPTODATE_API_KEY=your-uptodate-key
UPTODATE_BASE_URL=https://api.connect.uptodate.com
```

Both variables are used exclusively in Edge Functions. They are never exposed to the client.

### Edge Function Configuration

The `uptodate-lookup` Edge Function accepts:

```typescript
interface UpToDateRequest {
  /** Search query (diagnosis, symptom, or medication name) */
  query: string;
  /** Maximum number of topics to return */
  maxTopics?: number; // default: 3
  /** Whether to include full recommendations */
  includeRecommendations?: boolean; // default: true
  /** Visit ID for logging */
  visitId: string;
}
```

### Response Structure

```typescript
interface UpToDateResponse {
  topics: Array<{
    id: string;
    title: string;
    lastUpdated: string;
    recommendations: Array<{
      id: string;
      text: string;
      grade: "1A" | "1B" | "1C" | "2A" | "2B" | "2C";
    }>;
    articleUrl?: string;
  }>;
  source: "uptodate" | "perplexity" | "pubmed" | "none";
  cached: boolean;
}
```

---

## Implementation Status

| Feature | Status |
|---|---|
| UpToDatePanel component | Implemented (UI ready) |
| Evidence grade color coding | Implemented |
| "Powered by UpToDate" attribution | Implemented |
| Article link | Implemented |
| UpToDate SourceTag type | Implemented |
| `uptodate-lookup` Edge Function | Placeholder (awaiting API key) |
| Integration with `generate-briefing` | Designed |
| Integration with `research-query` | Designed |
| Integration with `generate-note` | Designed |
| Fallback chain | Designed |
| Content caching (1-hour TTL) | Designed |

### Prerequisites for Full Activation

1. Obtain UpToDate Connect API key from Wolters Kluwer Developer Program
2. Complete license agreement review (ensure Bangladesh deployment is covered)
3. Set `UPTODATE_API_KEY` and `UPTODATE_BASE_URL` in Edge Function environment
4. Implement `uptodate-lookup` Edge Function
5. Integrate UpToDate queries into `generate-briefing` and `research-query` Edge Functions
6. Test with representative Bangladesh clinical scenarios
