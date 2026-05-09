import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    // Get all ingredients without allergen links
    const { data: allIngredients } = await supabase
      .from('ingredients')
      .select('id, name, category')
      .order('name')

    const { data: existingLinks } = await supabase
      .from('ingredient_allergens')
      .select('ingredient_id')

    const linkedIds = new Set((existingLinks || []).map((l: any) => l.ingredient_id))
    const unlinked = (allIngredients || []).filter((i: any) => !linkedIds.has(i.id))

    if (unlinked.length === 0) {
      return NextResponse.json({ success: true, message: 'Alle ingrediënten hebben al allergeen-links', detected: 0, inserted: 0 })
    }

    // Get allergen list
    const { data: allergens } = await supabase.from('allergens').select('id, eu_number, code, name_nl').order('eu_number')
    const allergenByEu: Record<number, string> = {}
    for (const a of allergens || []) allergenByEu[a.eu_number] = a.id

    // Process in batches of 40
    const BATCH_SIZE = 40
    const results: Record<string, number[]> = {}

    for (let i = 0; i < unlinked.length; i += BATCH_SIZE) {
      const batch = unlinked.slice(i, i + BATCH_SIZE)
      const batchForClaude = batch.map((ing: any) => ({ id: ing.id, name: ing.name, category: ing.category }))

      const prompt = `You are a food allergen expert. For each ingredient, identify which EU allergens it DIRECTLY contains.

EU Allergen codes: 1=gluten, 2=shellfish, 3=eggs, 4=fish, 5=peanuts, 6=soy, 7=milk, 8=nuts, 9=celery, 10=mustard, 11=sesame, 12=sulfites, 13=lupin, 14=molluscs

Ingredients:
${JSON.stringify(batchForClaude)}

Return ONLY a JSON object: {"ingredient_id": [eu_number_codes], ...}
Use empty array [] if no allergens. Be precise about base ingredients only.`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : ''
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          const detected = JSON.parse(match[0])
          Object.assign(results, detected)
        } catch {}
      }
    }

    // Build inserts
    const inserts: { ingredient_id: string; allergen_id: string; severity: string; is_global: boolean }[] = []
    for (const [ingId, euNumbers] of Object.entries(results)) {
      for (const euNum of euNumbers as number[]) {
        const allergenId = allergenByEu[euNum]
        if (allergenId) {
          inserts.push({ ingredient_id: ingId, allergen_id: allergenId, severity: 'contains', is_global: true })
        }
      }
    }

    let inserted = 0
    if (inserts.length > 0) {
      const { error } = await supabase.from('ingredient_allergens').upsert(inserts, { onConflict: 'ingredient_id,allergen_id' })
      if (!error) inserted = inserts.length
    }

    const detected = Object.values(results).filter((v) => (v as number[]).length > 0).length
    return NextResponse.json({
      success: true,
      scanned: unlinked.length,
      detected,
      inserted,
      message: `${unlinked.length} ingrediënten gescand — ${detected} met allergenen — ${inserted} links opgeslagen`
    })

  } catch (err) {
    console.error('Auto-detect error:', err)
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}
