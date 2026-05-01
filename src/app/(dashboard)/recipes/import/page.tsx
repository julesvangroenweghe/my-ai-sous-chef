'use client'

// src/app/(dashboard)/recipes/import/page.tsx

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import Link from 'next/link'

type Tab = 'foto' | 'tekst' | 'evernote'

interface ExtractedIngredient {
  name: string
  quantity: string | null
  unit: string | null
}

interface ExtractedRecipe {
  name: string
  description: string
  category: string
  servings: number
  prep_time_minutes: number
  ingredients: ExtractedIngredient[]
  steps: string[]
  notes: string
  // UI state
  _id: string
  _saved: boolean
  _saving: boolean
}

const CATEGORY_MAP: Record<string, string> = {
  voorgerecht: 'Voorgerecht',
  hoofdgerecht: 'Hoofdgerecht',
  dessert: 'Dessert',
  bijgerecht: 'Bijgerecht',
  saus: 'Saus',
  basis: 'Basis',
  hapje: 'Hapje',
  overige: 'Overige',
}

export default function RecipeImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const { kitchen } = useKitchen()

  const [activeTab, setActiveTab] = useState<Tab>('foto')
  const [files, setFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [pastedText, setPastedText] = useState('')
  const [enexText, setEnexText] = useState('')
  const [loading, setLoading] = useState(false)
  const [recipes, setRecipes] = useState<ExtractedRecipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const enexInputRef = useRef<HTMLInputElement>(null)

  // File handling
  const handleFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    ).slice(0, 10)

    setFiles(prev => [...prev, ...imageFiles].slice(0, 10))

    // Generate previews for images
    imageFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreviews(prev => [...prev, ''])
      }
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [handleFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Evernote .enex parsing
  const handleEnexFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const xml = e.target?.result as string
      // Extract text from .enex XML
      const noteContents: string[] = []
      const titleMatches = xml.match(/<title>(.*?)<\/title>/g) || []
      const contentMatches = xml.match(/<content>([\s\S]*?)<\/content>/g) || []

      contentMatches.forEach((content, i) => {
        const title = titleMatches[i]?.replace(/<\/?title>/g, '') || `Recept ${i + 1}`
        const text = content
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()

        if (text.length > 50) {
          noteContents.push(`## ${title}\n\n${text}`)
        }
      })

      setEnexText(noteContents.join('\n\n---\n\n'))
    }
    reader.readAsText(file)
  }

  // Main analysis function
  const analyze = async () => {
    setError(null)
    setRecipes([])
    setLoading(true)

    try {
      let response: Response

      if (activeTab === 'foto' && files.length > 0) {
        const formData = new FormData()
        files.forEach(f => formData.append('files', f))
        response = await fetch('/api/recipes/ocr-import', {
          method: 'POST',
          body: formData,
        })
      } else if (activeTab === 'tekst' && pastedText.trim()) {
        response = await fetch('/api/recipes/ocr-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText }),
        })
      } else if (activeTab === 'evernote' && enexText.trim()) {
        response = await fetch('/api/recipes/ocr-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: enexText }),
        })
      } else {
        setError('Voeg eerst een foto, tekst of Evernote-bestand toe.')
        setLoading(false)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Import mislukt')
        setLoading(false)
        return
      }

      if (!data.recipes?.length) {
        setError('Geen recepten gevonden in de aangeleverde inhoud.')
        setLoading(false)
        return
      }

      setRecipes(data.recipes.map((r: any, i: number) => ({
        ...r,
        servings: r.servings || 4,
        prep_time_minutes: r.prep_time_minutes || 30,
        ingredients: r.ingredients || [],
        steps: r.steps || [],
        notes: r.notes || '',
        _id: `r${i}`,
        _saved: false,
        _saving: false,
      })))
    } catch (err: any) {
      setError(err.message || 'Er is iets misgegaan')
    } finally {
      setLoading(false)
    }
  }

  // Save one recipe to Supabase
  const saveRecipe = async (recipe: ExtractedRecipe) => {
    if (!kitchen?.id) return

    setRecipes(prev => prev.map(r =>
      r._id === recipe._id ? { ...r, _saving: true } : r
    ))

    try {
      const description = [
        recipe.description,
        recipe.notes ? `\n\nNotities: ${recipe.notes}` : '',
        '\n\nIngrediënten:\n' + recipe.ingredients
          .map(i => `- ${i.quantity || ''} ${i.unit || ''} ${i.name}`.trim())
          .join('\n'),
        '\n\nBereidingswijze:\n' + recipe.steps.join('\n'),
      ].filter(Boolean).join('')

      const { error: dbError } = await supabase
        .from('recipes')
        .insert({
          name: recipe.name,
          description,
          kitchen_id: kitchen.id,
          number_of_servings: recipe.servings,
          prep_time_minutes: recipe.prep_time_minutes,
          total_cost_per_serving: 0,
        })

      if (dbError) throw new Error(dbError.message)

      setRecipes(prev => prev.map(r =>
        r._id === recipe._id ? { ...r, _saved: true, _saving: false } : r
      ))
    } catch (err: any) {
      setRecipes(prev => prev.map(r =>
        r._id === recipe._id ? { ...r, _saving: false } : r
      ))
      setError(`Opslaan mislukt: ${err.message}`)
    }
  }

  const saveAll = async () => {
    const unsaved = recipes.filter(r => !r._saved && !r._saving)
    for (const recipe of unsaved) {
      await saveRecipe(recipe)
    }
  }

  const updateRecipe = (id: string, field: string, value: any) => {
    setRecipes(prev => prev.map(r =>
      r._id === id ? { ...r, [field]: value } : r
    ))
  }

  const canAnalyze = (
    (activeTab === 'foto' && files.length > 0) ||
    (activeTab === 'tekst' && pastedText.trim().length > 20) ||
    (activeTab === 'evernote' && enexText.trim().length > 20)
  )

  const savedCount = recipes.filter(r => r._saved).length

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link href="/recipes" style={{ color: '#9E7E60', textDecoration: 'none', fontSize: 13 }}>
            ← Recepten
          </Link>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2C1810', margin: 0 }}>
          Recepten importeren
        </h1>
        <p style={{ color: '#9E7E60', marginTop: 4, fontSize: 14 }}>
          Voeg recepten toe via foto, tekst of Evernote-export — de AI structureert alles automatisch.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        backgroundColor: '#F2E8D5',
        borderRadius: 10,
        padding: 4,
        marginBottom: 24,
      }}>
        {(['foto', 'tekst', 'evernote'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s',
              backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
              color: activeTab === tab ? '#2C1810' : '#9E7E60',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab === 'foto' && '📸 Foto / Scan'}
            {tab === 'tekst' && '📋 Tekst plakken'}
            {tab === 'evernote' && '🗒️ Evernote (.enex)'}
          </button>
        ))}
      </div>

      {/* Tab: Foto */}
      {activeTab === 'foto' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#E8A040' : '#E8D5B5'}`,
              borderRadius: 14,
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragging ? '#FEF3E2' : '#FDFAF6',
              transition: 'all 0.15s',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
            <p style={{ color: '#2C1810', fontWeight: 600, margin: 0, marginBottom: 4 }}>
              Sleep foto&apos;s hierheen of klik om te kiezen
            </p>
            <p style={{ color: '#9E7E60', fontSize: 12, margin: 0 }}>
              JPG, PNG, HEIC, PDF — tot 10 afbeeldingen tegelijk — ook screenshots van Evernote
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={e => handleFiles(Array.from(e.target.files || []))}
            />
          </div>

          {/* File previews */}
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {files.map((file, i) => (
                <div key={i} style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #E8D5B5',
                  backgroundColor: '#F2E8D5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {filePreviews[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreviews[i]}
                      alt={file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 24 }}>📄</span>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setFiles(prev => prev.filter((_, j) => j !== i))
                      setFilePreviews(prev => prev.filter((_, j) => j !== i))
                    }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  border: '2px dashed #E8D5B5',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#9E7E60',
                  fontSize: 24,
                }}
              >+</button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Tekst */}
      {activeTab === 'tekst' && (
        <div>
          <p style={{ color: '#9E7E60', fontSize: 13, marginBottom: 12 }}>
            Kopieer en plak een of meerdere recepten — uit Evernote, Word, een e-mail, of gewoon getypt.
          </p>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder={`Plak hier je recept(en)...\n\nBijvoorbeeld:\nBouillon van geroosterde groenten\n\nIngrediënten:\n- 2 uien\n- 3 wortels\n...\n\nBereidingswijze:\n1. Rooster de groenten...\n2. ...`}
            style={{
              width: '100%',
              minHeight: 300,
              padding: '14px 16px',
              border: '1px solid #E8D5B5',
              borderRadius: 10,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#2C1810',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          {pastedText && (
            <p style={{ color: '#9E7E60', fontSize: 12, marginTop: 6 }}>
              {pastedText.length} tekens
            </p>
          )}
        </div>
      )}

      {/* Tab: Evernote */}
      {activeTab === 'evernote' && (
        <div>
          <div style={{
            backgroundColor: '#FEF3E2',
            border: '1px solid #E8D5B5',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <p style={{ fontWeight: 600, color: '#2C1810', margin: 0, marginBottom: 8, fontSize: 14 }}>
              Hoe exporteer je uit Evernote?
            </p>
            <ol style={{ color: '#5C4730', fontSize: 13, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
              <li>Open Evernote desktop app (Mac of Windows)</li>
              <li>Selecteer je recepten-notitieboek in de zijbalk</li>
              <li>Rechtermuisklik → <strong>Notities exporteren...</strong></li>
              <li>Kies <strong>.enex</strong> als formaat en sla op</li>
              <li>Upload het bestand hieronder</li>
            </ol>
          </div>

          <div
            onClick={() => enexInputRef.current?.click()}
            style={{
              border: '2px dashed #E8D5B5',
              borderRadius: 14,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#FDFAF6',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗒️</div>
            <p style={{ color: '#2C1810', fontWeight: 600, margin: 0, marginBottom: 4 }}>
              Klik om je .enex bestand te kiezen
            </p>
            <p style={{ color: '#9E7E60', fontSize: 12, margin: 0 }}>
              Evernote export bestand (.enex)
            </p>
            <input
              ref={enexInputRef}
              type="file"
              accept=".enex"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleEnexFile(file)
              }}
            />
          </div>

          {enexText && (
            <div style={{
              backgroundColor: '#F2E8D5',
              border: '1px solid #E8D5B5',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 12,
              color: '#5C4730',
            }}>
              Bestand geladen — {enexText.split('---').length} notitie(s) gevonden ({enexText.length} tekens)
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 10,
          padding: '12px 16px',
          color: '#DC2626',
          fontSize: 13,
          marginTop: 16,
        }}>
          {error}
        </div>
      )}

      {/* Analyze button */}
      <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={analyze}
          disabled={!canAnalyze || loading}
          style={{
            backgroundColor: canAnalyze && !loading ? '#E8A040' : '#E8D5B5',
            color: canAnalyze && !loading ? 'white' : '#9E7E60',
            border: 'none',
            borderRadius: 10,
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: canAnalyze && !loading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              AI analyseert...
            </>
          ) : (
            <>
              ✨ Analyseren met AI
            </>
          )}
        </button>

        {recipes.length > 0 && savedCount < recipes.length && (
          <button
            onClick={saveAll}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #E8A040',
              color: '#E8A040',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Alles opslaan ({recipes.length - savedCount} recepten)
          </button>
        )}

        {savedCount > 0 && savedCount === recipes.length && (
          <Link
            href="/recipes"
            style={{
              backgroundColor: '#10B981',
              color: 'white',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ✓ {savedCount} recepten opgeslagen — Bekijk bibliotheek
          </Link>
        )}
      </div>

      {/* Results */}
      {recipes.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C1810', marginBottom: 4 }}>
            {recipes.length} {recipes.length === 1 ? 'recept' : 'recepten'} gevonden
          </h2>
          <p style={{ color: '#9E7E60', fontSize: 13, marginBottom: 20 }}>
            Controleer en pas aan waar nodig — dan opslaan.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recipes.map(recipe => (
              <div
                key={recipe._id}
                style={{
                  backgroundColor: recipe._saved ? '#F0FDF4' : 'white',
                  border: `1px solid ${recipe._saved ? '#86EFAC' : '#E8D5B5'}`,
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                {/* Recipe header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <input
                      value={recipe.name}
                      onChange={e => updateRecipe(recipe._id, 'name', e.target.value)}
                      disabled={recipe._saved}
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#2C1810',
                        border: 'none',
                        borderBottom: recipe._saved ? 'none' : '1px solid #E8D5B5',
                        width: '100%',
                        padding: '2px 0',
                        backgroundColor: 'transparent',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        backgroundColor: '#FEF3E2',
                        color: '#E8A040',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                      }}>
                        {CATEGORY_MAP[recipe.category] || recipe.category}
                      </span>
                      <span style={{ color: '#9E7E60', fontSize: 12 }}>
                        {recipe.servings} personen · {recipe.prep_time_minutes} min
                      </span>
                    </div>
                  </div>

                  {!recipe._saved ? (
                    <button
                      onClick={() => saveRecipe(recipe)}
                      disabled={recipe._saving}
                      style={{
                        backgroundColor: '#E8A040',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: recipe._saving ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {recipe._saving ? 'Opslaan...' : 'Opslaan'}
                    </button>
                  ) : (
                    <span style={{ color: '#10B981', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      ✓ Opgeslagen
                    </span>
                  )}
                </div>

                {/* Ingredients */}
                {recipe.ingredients.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9E7E60', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Ingrediënten ({recipe.ingredients.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {recipe.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: '#F2E8D5',
                            color: '#5C4730',
                            fontSize: 12,
                            padding: '3px 10px',
                            borderRadius: 20,
                          }}
                        >
                          {ing.quantity && `${ing.quantity} `}{ing.unit && `${ing.unit} `}{ing.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps preview */}
                {recipe.steps.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9E7E60', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Bereidingswijze ({recipe.steps.length} stappen)
                    </p>
                    <ol style={{ margin: 0, paddingLeft: 20, color: '#5C4730', fontSize: 13, lineHeight: 1.7 }}>
                      {recipe.steps.slice(0, 3).map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                      {recipe.steps.length > 3 && (
                        <li style={{ color: '#9E7E60', fontStyle: 'italic' }}>
                          + {recipe.steps.length - 3} meer stappen...
                        </li>
                      )}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
