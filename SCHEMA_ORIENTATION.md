# 🔍 PRAXIS SCHEMA ORIENTATION - All Agents

**Last Updated**: 2026-01-10  
**Status**: ✅ Schema Upgraded

---

## 📊 DATABASE SCHEMA

### **Table: users**
```sql
id: uuid (PK, FK to auth.users)
email: text (unique)
full_name: text
avatar_url: text
available_sessions: int (default: 1)
created_at: timestamptz
```

**Purpose**: User profiles with session credits  
**Key Logic**: `available_sessions` decremented on session start, incremented on purchase

---

### **Table: scenarios**
```sql
id: uuid (PK)
role: text -- 'SDE', 'PM', 'Data Scientist'
level: text -- 'Junior', 'Mid', 'Senior', 'L4', 'L5'
persona: text -- 'Skeptical', 'Neutral', 'Encouraging'
prompt: text -- Interview scenario description
evaluation_dimensions: text[] -- ['Architecture', 'Scale', 'Leadership']
created_at: timestamptz
```

**Purpose**: Interview scenario templates  
**Key Logic**: `evaluation_dimensions` injected into AI system prompt

---

### **Table: sessions**
```sql
id: uuid (PK)
user_id: uuid (FK to users)
scenario_id: uuid (FK to scenarios)
transcript: jsonb -- LEGACY: Full conversation
confidence_score: float -- LEGACY: Overall score
dimensions_covered: jsonb -- NEW: {"Architecture": true, "Scale": false}
confidence_scores: jsonb -- NEW: {"Architecture": 7.2, "Scale": 6.8}
duration_seconds: int
created_at: timestamptz
```

**Purpose**: Interview session records  
**Key Logic**: 
- Start session → Check `available_sessions > 0` → Decrement
- End session → Parse transcript → Fill `confidence_scores` JSONB

---

### **Table: messages**
```sql
id: uuid (PK)
session_id: uuid (FK to sessions)
role: text -- 'user' or 'assistant'
content: text
created_at: timestamptz
```

**Purpose**: Full chat history per session  
**Key Logic**: Each turn creates 2 messages (user + assistant)

---

### **Table: transcripts**
```sql
id: uuid (PK)
session_id: uuid (FK to sessions)
audio_url: text
text_content: text
sentiment_score: float
clarity_score: float
created_at: timestamptz
```

**Purpose**: Audio/text analysis per session  
**Key Logic**: Optional voice recording + sentiment analysis

---

### **Table: purchases**
```sql
id: uuid (PK)
user_id: uuid (FK to users)
order_id: text (unique, Razorpay order ID)
amount: int (in paise)
sessions_added: int
status: text -- 'pending', 'completed', 'failed'
created_at: timestamptz
```

**Purpose**: Payment tracking  
**Key Logic**: `status = 'completed'` → Trigger `increment_sessions()`

---

## 🤖 AGENT TASKS

### **Backend Agent**

#### Authentication Flow
```typescript
// Check available sessions before starting
const { data: user } = await supabase
  .from('users')
  .select('available_sessions')
  .eq('id', userId)
  .single()

if (user.available_sessions <= 0) {
  throw new Error('No sessions available')
}

// Decrement on session start
await supabase.rpc('decrement_sessions', { user_id: userId })
```

#### Payment Flow
```typescript
// On Razorpay success
await supabase.from('purchases').insert({
  user_id: userId,
  order_id: razorpayOrderId,
  amount: 49900, // ₹499 in paise
  sessions_added: 10,
  status: 'completed' // Triggers increment_sessions()
})
```

#### Session End Flow
```typescript
// Parse transcript and save scores
const scores = parseTranscript(messages) // AI analysis
await supabase.from('sessions').update({
  confidence_scores: {
    "Architecture": 7.2,
    "Scale": 6.8,
    "Leadership": 8.1
  },
  dimensions_covered: {
    "Architecture": true,
    "Scale": true,
    "Leadership": false
  }
}).eq('id', sessionId)
```

---

### **Simulator Agent** (CRITICAL)

#### System Prompt Construction
```typescript
const scenario = await supabase
  .from('scenarios')
  .select('*')
  .eq('id', scenarioId)
  .single()

const systemPrompt = `
You are a REAL ${scenario.role} ${scenario.level} interviewer.
Persona: ${scenario.persona}

SCENARIO: ${scenario.prompt}

EVALUATION DIMENSIONS: ${scenario.evaluation_dimensions.join(', ')}
You MUST cover these dimensions during the interview.

RULES:
1. Ask ONE question per turn
2. Adapt based on candidate responses
3. Maintain ${scenario.persona} tone
4. Track coverage of: ${scenario.evaluation_dimensions.join(', ')}

CHAT HISTORY:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

ASK YOUR NEXT QUESTION NOW:
`
```

#### Message Storage
```typescript
// Save each turn
await supabase.from('messages').insert([
  { session_id: sessionId, role: 'user', content: userMessage },
  { session_id: sessionId, role: 'assistant', content: aiResponse }
])
```

---

### **UI Agent**

#### Dashboard Display
```typescript
// Show sessions left
const { data: user } = await supabase
  .from('users')
  .select('available_sessions')
  .eq('id', userId)
  .single()

// Show dimension progress
const { data: sessions } = await supabase
  .from('sessions')
  .select('confidence_scores')
  .eq('user_id', userId)

// Render progress bars
dimensions.forEach(dim => {
  const scores = sessions.map(s => s.confidence_scores[dim]).filter(Boolean)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  renderProgressBar(dim, avg)
})
```

#### End Screen PDF Export
```typescript
// Generate PDF with scores
const { data: session } = await supabase
  .from('sessions')
  .select('*, scenarios(*)')
  .eq('id', sessionId)
  .single()

generatePDF({
  scenario: session.scenarios.prompt,
  dimensions: session.scenarios.evaluation_dimensions,
  scores: session.confidence_scores,
  covered: session.dimensions_covered
})
```

---

## ✅ VERIFICATION CHECKLIST

### Schema Verification
- [ ] `scenarios` table has `evaluation_dimensions` column (TEXT[])
- [ ] `sessions` table has `dimensions_covered` column (JSONB)
- [ ] `sessions` table has `confidence_scores` column (JSONB)
- [ ] `messages` table exists with `session_id` FK
- [ ] `transcripts` table exists
- [ ] `purchases` table exists

### Data Verification
- [ ] 5+ scenarios seeded with `evaluation_dimensions`
- [ ] Test session creates messages in `messages` table
- [ ] Session end populates `confidence_scores` JSONB

### Integration Verification
- [ ] Simulator prompt includes `evaluation_dimensions`
- [ ] Each turn saves 2 messages (user + assistant)
- [ ] End screen shows dimension scores

---

## 🚀 EXECUTION STEPS

1. **Execute Schema Upgrade**:
   - Open Supabase Dashboard → SQL Editor
   - Run `sql/schema_upgrade.sql`
   - Verify with: `SELECT * FROM scenarios LIMIT 5;`

2. **Test Scenario Loading**:
   - Navigate to `/simulator/[id]`
   - Check console: Does prompt include dimensions?

3. **Test Message Storage**:
   - Complete 3 turns in simulator
   - Check Supabase: `SELECT * FROM messages WHERE session_id = '...';`

4. **Test Session End**:
   - End session
   - Check: `SELECT confidence_scores FROM sessions WHERE id = '...';`

---

## 📝 NOTES

- **JSONB Format**: `{"dimension": value}` not `{dimension: value}`
- **Array Format**: `ARRAY['A', 'B']` in SQL, `['A', 'B']` in JS
- **Persona Types**: 'Skeptical', 'Neutral', 'Encouraging'
- **Message Roles**: 'user', 'assistant' (lowercase)

---

**Status**: Schema ready for parallel build 🎯
