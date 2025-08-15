import React, { useState, useRef, useEffect } from 'react'
// import './App.css' // This line was causing the error and has been removed.

// IMPORTANT: Using a hardcoded URL to avoid 'process is not defined' error
const BASE_URL = 'https://grammarpro.onrender.com';

const Button = ({ children, onClick, disabled, style, className }) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    style={style}
    className={className}
  >
    {children}
  </button>
)

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative',
        width: '90%'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>{title}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function App() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [grammarScore, setGrammarScore] = useState(null)
  const [suggestions, setSuggestions] = useState({})
  const [errors, setErrors] = useState([])
  const [categorizedSuggestions, setCategorizedSuggestions] = useState({})
  const [documentInsights, setDocumentInsights] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [highlightedText, setHighlightedText] = useState('')
  const [showInsights, setShowInsights] = useState(false)
  const [showAIRewrite, setShowAIRewrite] = useState(false)
  const [showToneAdjust, setShowToneAdjust] = useState(false)
  const [showEmailGenerator, setShowEmailGenerator] = useState(false)
  const [showParaphrase, setShowParaphrase] = useState(false)
  const [showCitations, setShowCitations] = useState(false)
  const [showAIDetector, setShowAIDetector] = useState(false)
  const [showEssayHelper, setShowEssayHelper] = useState(false)
  const [selectedErrorWord, setSelectedErrorWord] = useState(null)
  const [errorPopup, setErrorPopup] = useState({ show: false, x: 0, y: 0, suggestions: [], word: '', type: '' })
  
  // Premium feature states
  const [paraphraseResult, setParaphraseResult] = useState(null)
  const [citationsResult, setCitationsResult] = useState(null)
  const [aiDetectorResult, setAIDetectorResult] = useState(null)
  const [essayHelperResult, setEssayHelperResult] = useState(null)

  const textAreaRef = useRef(null)

  const checkGrammar = async () => {
    if (!text.trim()) return
    
    setIsChecking(true)
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      const data = await response.json()
      setGrammarScore(data.score)
      setSuggestions(data.suggestions)
      setErrors(data.errors || [])
      setCategorizedSuggestions(data.categorized_suggestions || {})
      setDocumentInsights(data.document_insights)
      
      // Create highlighted text with colored underlines
      createHighlightedText(text, data.errors || [])
      
    } catch (error) {
      console.error('Error checking grammar:', error)
      // Use a modal or in-page message instead of alert()
      // alert('Error checking grammar. Please try again.') 
    } finally {
      setIsChecking(false)
    }
  }

  const createHighlightedText = (originalText, errorList) => {
    if (!errorList || errorList.length === 0) {
      setHighlightedText(originalText)
      return
    }

    // Sort errors by position (descending) to avoid position shifts when replacing
    const sortedErrors = [...errorList].sort((a, b) => b.start - a.start)
    
    let highlightedText = originalText
    
    sortedErrors.forEach((error) => {
      const { word, start, end, type, color, suggestions } = error
      const beforeText = highlightedText.substring(0, start)
      const afterText = highlightedText.substring(end)
      
      // Create a span with colored underline and click handler
      const highlightedWord = `<span 
        class="error-highlight" 
        data-word="${word}" 
        data-suggestions="${suggestions.join(',')}" 
        data-type="${type}"
        style="
          text-decoration: underline; 
          text-decoration-color: ${color}; 
          text-decoration-thickness: 2px;
          cursor: pointer;
          position: relative;
        "
        onclick="handleErrorClick(event, '${word}', '${suggestions.join(',')}', '${type}')"
      >${word}</span>`
      
      highlightedText = beforeText + highlightedWord + afterText
    })
    
    setHighlightedText(highlightedText)
  }

  // Make handleErrorClick available globally
  useEffect(() => {
    window.handleErrorClick = (event, word, suggestionsStr, type) => {
      event.stopPropagation()
      const suggestions = suggestionsStr.split(',')
      const rect = event.target.getBoundingClientRect()
      
      setErrorPopup({
        show: true,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 5,
        suggestions,
        word,
        type
      })
    }
    
    return () => {
      delete window.handleErrorClick
    }
  }, [])

  const applySuggestion = (originalWord, suggestion) => {
    // Replace the word in the original text
    const newText = text.replace(new RegExp(`\\b${originalWord}\\b`, 'g'), suggestion)
    setText(newText)
    
    // Remove the error from the errors list
    const newErrors = errors.filter(error => error.word !== originalWord)
    setErrors(newErrors)
    
    // Recreate highlighted text
    createHighlightedText(newText, newErrors)
    
    // Close popup
    setErrorPopup({ show: false, x: 0, y: 0, suggestions: [], word: '', type: '' })
    
    // Update suggestions
    const newSuggestions = { ...suggestions }
    delete newSuggestions[originalWord]
    setSuggestions(newSuggestions)
  }

  const autoFixAllMistakes = async () => {
    if (!text.trim()) return
    
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/auto_fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      const data = await response.json()
      setText(data.fixed)
      
      // Clear all errors and suggestions
      setErrors([])
      setSuggestions({})
      setHighlightedText(data.fixed)
      
      // Use a modal or in-page message instead of alert()
      // alert(`Auto-fixed ${data.total_fixes} issues!`)
      
    } catch (error) {
      console.error('Error auto-fixing text:', error)
      // Use a modal or in-page message instead of alert()
      // alert('Error auto-fixing text. Please try again.')
    }
  }

  const downloadPDFReport = async () => {
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/pdf_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, insights: documentInsights, suggestions }),
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'advanced_grammar_report.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // Use a modal or in-page message instead of alert()
        // alert('Error generating PDF report')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      // Use a modal or in-page message instead of alert()
      // alert('Error downloading PDF report')
    }
  }

  const clearAnalysis = () => {
    setGrammarScore(null)
    setSuggestions({})
    setErrors([])
    setCategorizedSuggestions({})
    setDocumentInsights(null)
    setHighlightedText('')
    setErrorPopup({ show: false, x: 0, y: 0, suggestions: [], word: '', type: '' })
  }

  // Premium feature functions
  const handleParaphrase = async (style = 'standard') => {
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/paraphrase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      })
      const data = await response.json()
      setParaphraseResult(data)
    } catch (error) {
      console.error('Error paraphrasing:', error)
    }
  }

  const handleCitations = async (style = 'APA') => {
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/citations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      })
      const data = await response.json()
      setCitationsResult(data)
    } catch (error) {
      console.error('Error generating citations:', error)
    }
  }

  const handleAIDetector = async () => {
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/ai_detector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      setAIDetectorResult(data)
    } catch (error) {
      console.error('Error detecting AI content:', error)
    }
  }

  const handleEssayHelper = async (type = 'structure') => {
    try {
      // Use the full URL here
      const response = await fetch(`${BASE_URL}/api/grammar/essay_helper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type }),
      })
      const data = await response.json()
      setEssayHelperResult(data)
    } catch (error) {
      console.error('Error getting essay help:', error)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'
    if (score >= 70) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreText = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 70) return 'Good'
    return 'Needs Improvement'
  }

  const textAreaStyle = {
    width: '100%',
    minHeight: '300px',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    backgroundColor: '#fffbeb'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#0891b2',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            GrammarPro+ - Advanced Grammar Checker
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Left Column - Text Input */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            {/* Title Input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Type your title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Goals Button */}
            <div style={{ marginBottom: '16px' }}>
              <Button style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', fontSize: '12px' }}>
                Goals
              </Button>
            </div>

            {/* Premium Feature Buttons */}
            {grammarScore !== null && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button 
                  onClick={() => setShowParaphrase(true)}
                  style={{ backgroundColor: '#8b5cf6', color: 'white', fontSize: '12px', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                >
                  Paraphrase
                </Button>
                <Button 
                  onClick={() => setShowCitations(true)}
                  style={{ backgroundColor: '#06b6d4', color: 'white', fontSize: '12px', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                >
                  Citations
                </Button>
                <Button 
                  onClick={() => setShowAIDetector(true)}
                  style={{ backgroundColor: '#f59e0b', color: 'white', fontSize: '12px', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                >
                  AI Detector
                </Button>
                <Button 
                  onClick={() => setShowEssayHelper(true)}
                  style={{ backgroundColor: '#10b981', color: 'white', fontSize: '12px', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                >
                  Essay Helper
                </Button>
              </div>
            )}
            
            {/* Text Input Area */}
            <div style={{ position: 'relative' }}>
              {grammarScore !== null && highlightedText ? (
                <div
                  style={{
                    ...textAreaStyle,
                    whiteSpace: 'pre-wrap',
                    cursor: 'text',
                    minHeight: '300px',
                    lineHeight: '1.5'
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightedText }}
                  onClick={(e) => {
                    // Allow editing by focusing on the actual textarea
                    document.getElementById('main-textarea').focus()
                  }}
                />
              ) : (
                <textarea
                  id="main-textarea"
                  ref={textAreaRef}
                  placeholder="Start writing or paste your text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={textAreaStyle}
                />
              )}
              
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '14px', color: '#6b7280' }}>
                {text.split(' ').filter(word => word.length > 0).length} words
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button 
                onClick={checkGrammar} 
                disabled={isChecking || !text.trim()}
                style={{
                  backgroundColor: isChecking ? '#9ca3af' : '#0891b2',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: isChecking ? 'not-allowed' : 'pointer'
                }}
              >
                {isChecking ? 'Checking...' : 'Check Grammar'}
              </Button>
              
              {grammarScore !== null && (
                <>
                  <Button 
                    onClick={clearAnalysis}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  >
                    Clear Analysis
                  </Button>
                  <Button 
                    onClick={autoFixAllMistakes}
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  >
                    Auto-fix All Mistakes
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Analysis Results */}
          <div style={{ flex: '0 0 350px', minWidth: '300px' }}>
            {/* Grammar Score */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>Grammar Score</h3>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: `8px solid ${grammarScore !== null ? getScoreColor(grammarScore) : '#e5e7eb'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                backgroundColor: 'white'
              }}>
                <span style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: grammarScore !== null ? getScoreColor(grammarScore) : '#9ca3af'
                }}>
                  {grammarScore !== null ? grammarScore : '--'}
                </span>
              </div>
              {grammarScore !== null && (
                <>
                  <div style={{
                    color: getScoreColor(grammarScore),
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {getScoreText(grammarScore)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Tone: {documentInsights?.tone || 'neutral'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {(categorizedSuggestions?.correctness?.length || 0) + 
                     (categorizedSuggestions?.clarity?.length || 0) + 
                     (categorizedSuggestions?.engagement?.length || 0) + 
                     (categorizedSuggestions?.delivery?.length || 0)} suggestions found.
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {grammarScore !== null && (
              <div style={{ marginBottom: '24px' }}>
                <Button 
                  onClick={() => setShowInsights(true)}
                  style={{
                    width: '100%',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}
                >
                  View Document Insights
                </Button>
                <Button 
                  onClick={downloadPDFReport}
                  style={{
                    width: '100%',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  Download PDF Report
                </Button>
              </div>
            )}

            {/* Suggestions */}
            {grammarScore !== null && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>Suggestions</h3>
                
                {/* Category Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <Button style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Correctness {categorizedSuggestions?.correctness?.length || 0}
                  </Button>
                  <Button style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Clarity {categorizedSuggestions?.clarity?.length || 0}
                  </Button>
                  <Button style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Engagement {categorizedSuggestions?.engagement?.length || 0}
                  </Button>
                  <Button style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Delivery {categorizedSuggestions?.delivery?.length || 0}
                  </Button>
                </div>

                {/* Suggestion Items */}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {categorizedSuggestions?.correctness?.map((suggestion, index) => (
                    <div key={`correctness-${index}`} style={{
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      borderLeft: '4px solid #ef4444',
                      marginBottom: '8px',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '4px' }}>
                        • Correctness
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                        {suggestion.message}
                      </div>
                      {suggestion.suggestions?.map((sug, sugIndex) => (
                        <Button
                          key={sugIndex}
                          onClick={() => applySuggestion(suggestion.word, sug)}
                          style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginRight: '4px'
                          }}
                        >
                          Apply: {sug}
                        </Button>
                      ))}
                    </div>
                  ))}
                  
                  {categorizedSuggestions?.clarity?.map((suggestion, index) => (
                    <div key={`clarity-${index}`} style={{
                      padding: '12px',
                      backgroundColor: '#eff6ff',
                      borderLeft: '4px solid #3b82f6',
                      marginBottom: '8px',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '4px' }}>
                        • Clarity
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151' }}>
                        {suggestion.message}
                      </div>
                    </div>
                  ))}
                  
                  {categorizedSuggestions?.engagement?.map((suggestion, index) => (
                    <div key={`engagement-${index}`} style={{
                      padding: '12px',
                      backgroundColor: '#f0fdf4',
                      borderLeft: '4px solid #10b981',
                      marginBottom: '8px',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
                        • Engagement
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                        {suggestion.message}
                      </div>
                      {suggestion.suggestions?.map((sug, sugIndex) => (
                        <Button
                          key={sugIndex}
                          onClick={() => applySuggestion(suggestion.word, sug)}
                          style={{
                            backgroundColor: '#059669',
                            color: 'white',
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginRight: '4px'
                          }}
                        >
                          Apply: {sug}
                        </Button>
                      ))}
                    </div>
                  ))}
                  
                  {categorizedSuggestions?.delivery?.map((suggestion, index) => (
                    <div key={`delivery-${index}`} style={{
                      padding: '12px',
                      backgroundColor: '#fffbeb',
                      borderLeft: '4px solid #f59e0b',
                      marginBottom: '8px',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#d97706', marginBottom: '4px' }}>
                        • Delivery
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151' }}>
                        {suggestion.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Popup */}
        {errorPopup.show && (
          <div style={{
            position: 'absolute',
            left: errorPopup.x,
            top: errorPopup.y,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '200px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
              Suggestions for "{errorPopup.word}":
            </div>
            {errorPopup.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(errorPopup.word, suggestion)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 8px',
                  margin: '2px 0',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                {suggestion}
              </button>
            ))}
            <button
              onClick={() => setErrorPopup({ show: false, x: 0, y: 0, suggestions: [], word: '', type: '' })}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Document Insights Modal */}
        <Modal isOpen={showInsights} onClose={() => setShowInsights(false)} title="Document Insights">
          {documentInsights && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Overall Score</h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getScoreColor(grammarScore) }}>
                  {grammarScore}/100 - {getScoreText(grammarScore)}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Word Count</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{documentInsights.character_count}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Characters</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{documentInsights.word_count}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Words</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{documentInsights.sentence_count}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Sentences</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>~{documentInsights.reading_time}m</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Reading time</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>~{documentInsights.speaking_time}m</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Speaking time</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Readability Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {documentInsights.word_count > 0 ? 
                        (documentInsights.character_count / documentInsights.word_count).toFixed(1) : 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Word length (Average)</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {documentInsights.sentence_count > 0 ? 
                        (documentInsights.word_count / documentInsights.sentence_count).toFixed(1) : 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Sentence length (Average)</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{grammarScore}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Readability score (Very readable)</div>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Easy to read. Conversational English for consumers.
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Vocabulary Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>96% Unique words (Good)</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>92% Rare words (Good)</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Suggestions Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Correctness: {documentInsights.correctness_errors || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Clarity: {documentInsights.clarity_suggestions || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Engagement: {documentInsights.engagement_suggestions || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Delivery: {documentInsights.delivery_suggestions || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Paraphrase Modal */}
        <Modal isOpen={showParaphrase} onClose={() => setShowParaphrase(false)} title="Paraphrase Text">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button onClick={() => handleParaphrase('standard')} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                Standard
              </Button>
              <Button onClick={() => handleParaphrase('formal')} style={{ padding: '8px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px' }}>
                Formal
              </Button>
              <Button onClick={() => handleParaphrase('casual')} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px' }}>
                Casual
              </Button>
              <Button onClick={() => handleParaphrase('creative')} style={{ padding: '8px 16px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '4px' }}>
                Creative
              </Button>
            </div>
            {paraphraseResult && (
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4>Paraphrased Text ({paraphraseResult.style}):</h4>
                <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>{paraphraseResult.paraphrased}</p>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Confidence: {paraphraseResult.confidence}%
                </div>
                <Button 
                  onClick={() => setText(paraphraseResult.paraphrased.replace(/^[^:]+:\s*/, ''))}
                  style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Use This Version
                </Button>
              </div>
            )}
          </div>
        </Modal>

        {/* Citations Modal */}
        <Modal isOpen={showCitations} onClose={() => setShowCitations(false)} title="Generate Citations">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button onClick={() => handleCitations('APA')} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                APA
              </Button>
              <Button onClick={() => handleCitations('MLA')} style={{ padding: '8px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px' }}>
                MLA
              </Button>
              <Button onClick={() => handleCitations('Chicago')} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px' }}>
                Chicago
              </Button>
              <Button onClick={() => handleCitations('Harvard')} style={{ padding: '8px 16px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '4px' }}>
                Harvard
              </Button>
            </div>
            {citationsResult && (
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4>Generated Citations ({citationsResult.style}):</h4>
                {citationsResult.citations.map((citation, index) => (
                  <div key={index} style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                      For: "{citation.text}"
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                      {citation.citation}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Total citations found: {citationsResult.total_found}
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* AI Detector Modal */}
        <Modal isOpen={showAIDetector} onClose={() => setShowAIDetector(false)} title="AI Content Detection">
          <div style={{ marginBottom: '16px' }}>
            <Button onClick={handleAIDetector} style={{ padding: '12px 24px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', marginBottom: '16px' }}>
              Analyze Content
            </Button>
            {aiDetectorResult && (
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '50%', 
                    backgroundColor: aiDetectorResult.ai_probability > 50 ? '#ef4444' : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    marginRight: '16px'
                  }}>
                    {aiDetectorResult.ai_probability}%
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                      {aiDetectorResult.recommendation}
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      Confidence: {aiDetectorResult.confidence}
                    </div>
                  </div>
                </div>
                <div>
                  <h4>Detected Indicators:</h4>
                  <ul>
                    {aiDetectorResult.indicators.filter(Boolean).map((indicator, index) => (
                      <li key={index}>{indicator}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Essay Helper Modal */}
        <Modal isOpen={showEssayHelper} onClose={() => setShowEssayHelper(false)} title="Essay Writing Helper">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <Button onClick={() => handleEssayHelper('structure')} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                Structure
              </Button>
              <Button onClick={() => handleEssayHelper('thesis')} style={{ padding: '8px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px' }}>
                Thesis
              </Button>
              <Button onClick={() => handleEssayHelper('transitions')} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px' }}>
                Transitions
              </Button>
              <Button onClick={() => handleEssayHelper('conclusion')} style={{ padding: '8px 16px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '4px' }}>
                Conclusion
              </Button>
            </div>
            {essayHelperResult && (
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold' }}>Word Count: {essayHelperResult.word_count}</div>
                  <div style={{ fontWeight: 'bold' }}>Estimated Grade: {essayHelperResult.estimated_grade}</div>
                </div>
                <h4>Suggestions:</h4>
                {essayHelperResult.suggestions.map((suggestion, index) => (
                  <div key={index} style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                      {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>{suggestion.suggestion}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                      {suggestion.example}
                    </div>
                  </div>
                ))}
                <div>
                  <h4>Areas for Improvement:</h4>
                  <ul>
                    {essayHelperResult.improvement_areas.filter(Boolean).map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default App
