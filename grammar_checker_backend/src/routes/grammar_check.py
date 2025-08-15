from flask import Blueprint, request, jsonify, send_file, make_response
import re
import random
import json
import os
from fpdf import FPDF
import io

grammar_check_bp = Blueprint("grammar_check", __name__)

# Enhanced grammar rules for demonstration
GRAMMAR_RULES = {
    # Spelling errors
    'grammer': ['grammar'],
    'gramar': ['grammar'],
    'erors': ['errors'],
    'mispellings': ['misspellings'],
    'sentance': ['sentence'],
    'recieve': ['receive'],
    'seperate': ['separate'],
    'occured': ['occurred'],
    'definately': ['definitely'],
    'neccessary': ['necessary'],
    'accomodate': ['accommodate'],
    'embarass': ['embarrass'],
    'maintainance': ['maintenance'],
    'independant': ['independent'],
    'existance': ['existence'],
    'teh': ['the'],
    'adn': ['and'],
    'hte': ['the'],
    'taht': ['that'],
    'thier': ['their'],
    'ther': ['their', 'there'],
    'youre': ['you\'re'],
    'its': ['it\'s'],
    'alot': ['a lot'],
    'loose': ['lose'],
    'affect': ['effect'],
    'then': ['than'],
    'your': ['you\'re'],
    'there': ['their'],
    'to': ['too'],
    'weather': ['whether'],
    'accept': ['except'],
    'advise': ['advice'],
    'breath': ['breathe'],
    'choose': ['chose'],
    'desert': ['dessert'],
    'emigrate': ['immigrate'],
    'farther': ['further'],
    'historic': ['historical'],
    'imply': ['infer'],
    'lay': ['lie'],
    'principal': ['principle'],
    'stationary': ['stationery'],
    'who': ['whom']
}

# Vocabulary enhancement suggestions
VOCABULARY_ENHANCEMENT = {
    'very': ['extremely', 'incredibly', 'remarkably', 'exceptionally'],
    'good': ['excellent', 'outstanding', 'superb', 'exceptional'],
    'bad': ['terrible', 'awful', 'dreadful', 'poor'],
    'big': ['enormous', 'massive', 'huge', 'substantial'],
    'small': ['tiny', 'minuscule', 'compact', 'petite'],
    'nice': ['pleasant', 'delightful', 'wonderful', 'charming'],
    'said': ['stated', 'declared', 'mentioned', 'expressed'],
    'got': ['obtained', 'acquired', 'received', 'secured'],
    'make': ['create', 'produce', 'generate', 'construct'],
    'thing': ['item', 'object', 'element', 'aspect'],
    'stuff': ['items', 'materials', 'things', 'elements'],
    'really': ['truly', 'genuinely', 'actually', 'certainly'],
    'pretty': ['quite', 'rather', 'fairly', 'considerably'],
    'walk': ['stroll', 'stride', 'march', 'wander'],
    'look': ['observe', 'examine', 'inspect', 'gaze'],
    'think': ['consider', 'contemplate', 'ponder', 'reflect'],
    'happy': ['joyful', 'elated', 'delighted', 'cheerful'],
    'sad': ['melancholy', 'dejected', 'sorrowful', 'despondent'],
    'fast': ['rapid', 'swift', 'quick', 'speedy'],
    'slow': ['gradual', 'leisurely', 'unhurried', 'deliberate']
}

# Clarity improvement patterns
CLARITY_PATTERNS = {
    r'\bthat\s+that\b': 'Redundant "that" usage',
    r'\bvery\s+very\b': 'Redundant intensifier',
    r'\bin\s+order\s+to\b': 'Can be simplified to "to"',
    r'\bdue\s+to\s+the\s+fact\s+that\b': 'Can be simplified to "because"',
    r'\bat\s+this\s+point\s+in\s+time\b': 'Can be simplified to "now"',
    r'\bfor\s+the\s+purpose\s+of\b': 'Can be simplified to "to"',
    r'\bin\s+the\s+event\s+that\b': 'Can be simplified to "if"'
}

# Passive voice patterns
PASSIVE_VOICE_PATTERNS = [
    r'\b(was|were|is|are|am|be|been|being)\s+\w+ed\b',
    r'\b(was|were|is|are|am|be|been|being)\s+\w+en\b'
]

# Tone indicators
TONE_INDICATORS = {
    'formal': ['furthermore', 'consequently', 'therefore', 'moreover', 'nevertheless'],
    'informal': ['yeah', 'okay', 'cool', 'awesome', 'totally'],
    'confident': ['certainly', 'definitely', 'absolutely', 'undoubtedly', 'clearly'],
    'tentative': ['perhaps', 'maybe', 'possibly', 'might', 'could'],
    'friendly': ['please', 'thank you', 'appreciate', 'wonderful', 'great'],
    'professional': ['regarding', 'concerning', 'pursuant', 'accordingly', 'respectively']
}

# Conciseness suggestions
CONCISENESS_PATTERNS = {
    r'\ba\s+number\s+of\b': 'several',
    r'\ba\s+large\s+number\s+of\b': 'many',
    r'\ba\s+small\s+number\s+of\b': 'few',
    r'\bin\s+spite\s+of\s+the\s+fact\s+that\b': 'although',
    r'\bwith\s+regard\s+to\b': 'regarding',
    r'\bin\s+connection\s+with\b': 'about',
    r'\bfor\s+the\s+reason\s+that\b': 'because',
    r'\bin\s+view\s+of\s+the\s+fact\s+that\b': 'since'
}

def detect_tone(text):
    """Detect the overall tone of the text"""
    text_lower = text.lower()
    tone_scores = {}
    
    for tone, indicators in TONE_INDICATORS.items():
        score = sum(1 for indicator in indicators if indicator in text_lower)
        if score > 0:
            tone_scores[tone] = score
    
    if not tone_scores:
        return 'neutral'
    
    # Return the tone with the highest score
    return max(tone_scores, key=tone_scores.get)

def analyze_sentence_variety(text):
    """Analyze sentence variety and structure"""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return []
    
    suggestions = []
    sentence_lengths = [len(s.split()) for s in sentences]
    avg_length = sum(sentence_lengths) / len(sentence_lengths)
    
    # Check for monotonous sentence length
    if len(set(sentence_lengths)) < len(sentence_lengths) * 0.3:
        suggestions.append({
            "type": "delivery",
            "message": "Consider varying your sentence length for better flow",
            "suggestion": "Mix short and long sentences to create rhythm"
        })
    
    # Check for very long sentences
    long_sentences = [i for i, length in enumerate(sentence_lengths) if length > 25]
    if long_sentences:
        suggestions.append({
            "type": "clarity",
            "message": f"Sentence {long_sentences[0] + 1} is quite long. Consider breaking it up.",
            "suggestion": "Break long sentences into shorter, clearer ones"
        })
    
    return suggestions

def check_passive_voice(text):
    """Check for passive voice usage"""
    passive_instances = []
    
    for pattern in PASSIVE_VOICE_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            passive_instances.append({
                "start": match.start(),
                "end": match.end(),
                "text": match.group(),
                "type": "delivery",
                "message": "Consider using active voice for more direct communication",
                "suggestion": "Rewrite in active voice"
            })
    
    return passive_instances

def generate_ai_rewrite(text, style='improve'):
    """Generate AI-powered rewrite suggestions"""
    # This is a simplified version - in a real implementation, you'd use an AI API
    rewrites = {
        'improve': [
            "Here's a clearer version of your text...",
            "Consider this improved phrasing...",
            "A more polished version might be..."
        ],
        'formal': [
            "A more formal version would be...",
            "In professional writing, consider...",
            "For academic or business contexts..."
        ],
        'casual': [
            "A more conversational approach...",
            "In a casual tone, you might say...",
            "For informal communication..."
        ],
        'concise': [
            "A more concise version...",
            "To be more direct...",
            "Simplified, this becomes..."
        ]
    }
    
    return random.choice(rewrites.get(style, rewrites['improve']))

@grammar_check_bp.route("/check", methods=["POST"])
def check_grammar():
    data = request.get_json()
    text = data.get("text", "")
    
    if not text.strip():
        return jsonify({
            "score": 100,
            "suggestions": {},
            "errors": [],
            "document_insights": {
                "word_count": 0,
                "character_count": 0,
                "sentence_count": 0,
                "reading_time": 0,
                "speaking_time": 0,
                "tone": "neutral"
            },
            "advanced_features": {
                "tone_detection": "neutral",
                "ai_rewrites": [],
                "conciseness_suggestions": [],
                "passive_voice_instances": []
            }
        })
    
    # Calculate basic metrics
    words = re.findall(r'\b\w+\b', text.lower())
    word_count = len(words)
    character_count = len(text)
    sentence_count = len(re.findall(r'[.!?]+', text))
    if sentence_count == 0:
        sentence_count = 1
    
    reading_time = max(1, word_count // 200)  # Average reading speed: 200 words per minute
    speaking_time = max(1, word_count // 150)  # Average speaking speed: 150 words per minute
    
    # Detect tone
    detected_tone = detect_tone(text)
    
    # Check for grammar errors and suggestions
    suggestions = {}
    errors = []  # List of error objects with positions
    correctness_errors = 0
    clarity_suggestions = 0
    engagement_suggestions = 0
    delivery_suggestions = 0
    
    # Find all words with their positions
    word_pattern = re.compile(r'\b\w+\b')
    word_matches = list(word_pattern.finditer(text))
    
    # Check for spelling/grammar errors (correctness)
    for match in word_matches:
        word = match.group()
        word_lower = word.lower()
        start_pos = match.start()
        end_pos = match.end()
        
        if word_lower in GRAMMAR_RULES:
            if word not in suggestions:
                suggestions[word] = GRAMMAR_RULES[word_lower]
                errors.append({
                    "word": word,
                    "start": start_pos,
                    "end": end_pos,
                    "type": "correctness",
                    "color": "red",
                    "suggestions": GRAMMAR_RULES[word_lower],
                    "message": "Spelling or grammar error"
                })
                correctness_errors += 1
    
    # Check for vocabulary enhancement (engagement)
    word_frequency = {}
    word_positions = {}
    
    for match in word_matches:
        word = match.group()
        word_lower = word.lower()
        if len(word_lower) > 2:  # Check words longer than 2 characters
            if word_lower not in word_frequency:
                word_frequency[word_lower] = 0
                word_positions[word_lower] = []
            word_frequency[word_lower] += 1
            word_positions[word_lower].append({
                "word": word,
                "start": match.start(),
                "end": match.end()
            })
    
    # Find vocabulary enhancement opportunities
    for word_lower, positions in word_positions.items():
        if word_lower in VOCABULARY_ENHANCEMENT:
            # Add the first instance as an engagement suggestion
            pos_info = positions[0]
            word = pos_info["word"]
            if word not in suggestions:
                suggestions[word] = VOCABULARY_ENHANCEMENT[word_lower]
                errors.append({
                    "word": word,
                    "start": pos_info["start"],
                    "end": pos_info["end"],
                    "type": "engagement",
                    "color": "blue",
                    "suggestions": VOCABULARY_ENHANCEMENT[word_lower],
                    "message": "Consider a more precise or engaging word"
                })
                engagement_suggestions += 1
    
    # Check for clarity issues
    for pattern, message in CLARITY_PATTERNS.items():
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            errors.append({
                "word": match.group(),
                "start": match.start(),
                "end": match.end(),
                "type": "clarity",
                "color": "green",
                "suggestions": ["Simplify this phrase"],
                "message": message
            })
            clarity_suggestions += 1
    
    # Check for conciseness issues
    for pattern, replacement in CONCISENESS_PATTERNS.items():
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            errors.append({
                "word": match.group(),
                "start": match.start(),
                "end": match.end(),
                "type": "clarity",
                "color": "green",
                "suggestions": [replacement],
                "message": "This phrase can be simplified"
            })
            clarity_suggestions += 1
    
    # Check for passive voice
    passive_voice_instances = check_passive_voice(text)
    for instance in passive_voice_instances:
        errors.append({
            "word": instance["text"],
            "start": instance["start"],
            "end": instance["end"],
            "type": "delivery",
            "color": "orange",
            "suggestions": ["Use active voice"],
            "message": instance["message"]
        })
        delivery_suggestions += 1
    
    # Analyze sentence variety
    sentence_variety_suggestions = analyze_sentence_variety(text)
    
    # Calculate grammar score based on number and type of errors
    total_errors = correctness_errors + clarity_suggestions + engagement_suggestions + delivery_suggestions
    
    if total_errors == 0:
        score = 100
    else:
        # Weight different types of errors differently
        weighted_score = (
            correctness_errors * 20 +  # Most important
            clarity_suggestions * 15 +
            delivery_suggestions * 10 +
            engagement_suggestions * 5   # Least critical
        )
        score = max(30, 100 - weighted_score)
    
    # Categorize suggestions by type for better organization
    categorized_suggestions = {
        "correctness": [],
        "clarity": [],
        "engagement": [],
        "delivery": []
    }
    
    for error in errors:
        category = error["type"]
        categorized_suggestions[category].append({
            "word": error["word"],
            "suggestions": error["suggestions"],
            "message": error["message"]
        })
    
    # Add sentence variety suggestions to delivery
    for suggestion in sentence_variety_suggestions:
        categorized_suggestions[suggestion["type"]].append({
            "word": "Sentence structure",
            "suggestions": [suggestion["suggestion"]],
            "message": suggestion["message"]
        })
    
    # Generate AI rewrite suggestions
    ai_rewrites = []
    if word_count > 10:  # Only for substantial text
        ai_rewrites = [
            {
                "type": "improve",
                "title": "Overall Improvement",
                "suggestion": generate_ai_rewrite(text, 'improve')
            },
            {
                "type": "formal",
                "title": "More Formal",
                "suggestion": generate_ai_rewrite(text, 'formal')
            },
            {
                "type": "concise",
                "title": "More Concise",
                "suggestion": generate_ai_rewrite(text, 'concise')
            }
        ]
    
    return jsonify({
        "score": score,
        "suggestions": suggestions,
        "errors": errors,  # Enhanced with color information
        "categorized_suggestions": categorized_suggestions,
        "document_insights": {
            "word_count": word_count,
            "character_count": character_count,
            "sentence_count": sentence_count,
            "reading_time": reading_time,
            "speaking_time": speaking_time,
            "tone": detected_tone,
            "correctness_errors": correctness_errors,
            "clarity_suggestions": clarity_suggestions,
            "engagement_suggestions": engagement_suggestions,
            "delivery_suggestions": delivery_suggestions
        },
        "advanced_features": {
            "tone_detection": detected_tone,
            "ai_rewrites": ai_rewrites,
            "conciseness_suggestions": len([e for e in errors if "simplified" in e.get("message", "").lower()]),
            "passive_voice_instances": len(passive_voice_instances),
            "sentence_variety_score": 85 if len(sentence_variety_suggestions) == 0 else 70
        }
    })

@grammar_check_bp.route("/ai_rewrite", methods=["POST"])
def ai_rewrite():
    """Generate AI-powered rewrites for text"""
    data = request.get_json()
    text = data.get("text", "")
    style = data.get("style", "improve")  # improve, formal, casual, concise
    
    if not text.strip():
        return jsonify({"error": "No text provided"}), 400
    
    # In a real implementation, this would call an AI API like OpenAI
    # For now, we'll provide template-based rewrites
    
    rewrite_templates = {
        "improve": {
            "title": "Improved Version",
            "rewrite": f"Here's an enhanced version of your text: {text[:50]}... [This would be an AI-improved version]"
        },
        "formal": {
            "title": "Formal Version",
            "rewrite": f"In a more formal tone: {text[:50]}... [This would be a more formal version]"
        },
        "casual": {
            "title": "Casual Version", 
            "rewrite": f"In a casual tone: {text[:50]}... [This would be a more casual version]"
        },
        "concise": {
            "title": "Concise Version",
            "rewrite": f"More concisely: {text[:30]}... [This would be a shorter version]"
        }
    }
    
    return jsonify(rewrite_templates.get(style, rewrite_templates["improve"]))

@grammar_check_bp.route("/tone_adjust", methods=["POST"])
def tone_adjust():
    """Adjust the tone of text"""
    data = request.get_json()
    text = data.get("text", "")
    target_tone = data.get("tone", "professional")  # professional, friendly, assertive, diplomatic
    
    if not text.strip():
        return jsonify({"error": "No text provided"}), 400
    
    tone_adjustments = {
        "professional": f"In a professional tone: {text[:50]}... [Professional version would be generated here]",
        "friendly": f"In a friendly tone: {text[:50]}... [Friendly version would be generated here]",
        "assertive": f"More assertively: {text[:50]}... [Assertive version would be generated here]",
        "diplomatic": f"More diplomatically: {text[:50]}... [Diplomatic version would be generated here]"
    }
    
    return jsonify({
        "original": text,
        "adjusted": tone_adjustments.get(target_tone, tone_adjustments["professional"]),
        "tone": target_tone
    })

@grammar_check_bp.route("/email_generate", methods=["POST"])
def email_generate():
    """Generate email from prompt"""
    data = request.get_json()
    prompt = data.get("prompt", "")
    email_type = data.get("type", "professional")  # professional, casual, follow-up
    
    if not prompt.strip():
        return jsonify({"error": "No prompt provided"}), 400
    
    # Template-based email generation (would use AI in real implementation)
    email_templates = {
        "professional": f"""Subject: {prompt[:30]}...

Dear [Recipient],

I hope this email finds you well. I am writing to {prompt.lower()}.

[Generated professional email content based on: {prompt}]

Best regards,
[Your Name]""",
        
        "casual": f"""Hey [Name],

Hope you're doing well! I wanted to reach out about {prompt.lower()}.

[Generated casual email content based on: {prompt}]

Thanks!
[Your Name]""",
        
        "follow-up": f"""Subject: Following up on {prompt[:30]}...

Hi [Name],

I wanted to follow up on {prompt.lower()}.

[Generated follow-up email content based on: {prompt}]

Looking forward to hearing from you.

Best,
[Your Name]"""
    }
    
    return jsonify({
        "prompt": prompt,
        "email": email_templates.get(email_type, email_templates["professional"]),
        "type": email_type
    })

@grammar_check_bp.route("/pdf_report", methods=["POST"])
def generate_pdf_report():
    data = request.get_json()
    text = data.get("text", "")
    insights = data.get("insights", {})
    suggestions = data.get("suggestions", {})
    
    # Create PDF using FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Arial', 'B', 16)
    
    # Title
    pdf.cell(0, 10, 'Advanced Grammar Analysis Report', 0, 1, 'C')
    pdf.ln(10)
    
    # Original Text
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Original Text:', 0, 1)
    pdf.set_font('Arial', '', 10)
    
    # Split text into lines that fit the page width
    text_lines = []
    words = text.split()
    current_line = ""
    for word in words:
        if len(current_line + " " + word) < 80:  # Approximate character limit per line
            current_line += " " + word if current_line else word
        else:
            text_lines.append(current_line)
            current_line = word
    if current_line:
        text_lines.append(current_line)
    
    for line in text_lines:
        # Handle encoding issues by replacing problematic characters
        safe_line = line.encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(0, 6, safe_line, 0, 1)
    
    pdf.ln(10)
    
    # Document Analysis
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Document Analysis:', 0, 1)
    pdf.set_font('Arial', '', 10)
    
    score = insights.get('overall_score', 85)
    assessment = "Excellent" if score >= 90 else "Good" if score >= 70 else "Needs Improvement"
    
    analysis_data = [
        f"Overall Score: {score}/100 ({assessment})",
        f"Word Count: {insights.get('word_count', 0)}",
        f"Character Count: {insights.get('character_count', 0)}",
        f"Sentence Count: {insights.get('sentence_count', 0)}",
        f"Reading Time: ~{insights.get('reading_time', 0)}m",
        f"Speaking Time: ~{insights.get('speaking_time', 0)}m",
        f"Detected Tone: {insights.get('tone', 'neutral').title()}"
    ]
    
    for item in analysis_data:
        safe_item = item.encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(0, 6, safe_item, 0, 1)
    
    pdf.ln(10)
    
    # Advanced Analysis
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Advanced Analysis:', 0, 1)
    pdf.set_font('Arial', '', 10)
    
    advanced_data = [
        f"Correctness Issues: {insights.get('correctness_errors', 0)} (High priority fixes)",
        f"Clarity Suggestions: {insights.get('clarity_suggestions', 0)} (Improves understanding)",
        f"Engagement Opportunities: {insights.get('engagement_suggestions', 0)} (Enhances reader interest)",
        f"Delivery Improvements: {insights.get('delivery_suggestions', 0)} (Strengthens impact)"
    ]
    
    for item in advanced_data:
        safe_item = item.encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(0, 6, safe_item, 0, 1)
    
    pdf.ln(10)
    
    # Suggestions
    if suggestions:
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, 'Detailed Suggestions:', 0, 1)
        pdf.set_font('Arial', '', 10)
        
        for original, suggestion_list in list(suggestions.items())[:10]:  # Limit to first 10
            suggestion_text = f"{original} -> {', '.join(suggestion_list[:3])}"
            safe_suggestion = suggestion_text.encode('latin-1', 'replace').decode('latin-1')
            pdf.cell(0, 6, safe_suggestion, 0, 1)
    
    pdf.ln(10)
    
    # Summary
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Summary:', 0, 1)
    pdf.set_font('Arial', '', 10)
    
    if score >= 90:
        summary = "Your writing demonstrates exceptional quality with minimal areas for improvement."
    elif score >= 70:
        summary = "Your writing is solid with some opportunities for enhancement."
    else:
        summary = "Focus on addressing correctness issues first, then work on clarity and engagement."
    
    # Split summary into lines
    summary_lines = []
    words = summary.split()
    current_line = ""
    for word in words:
        if len(current_line + " " + word) < 80:
            current_line += " " + word if current_line else word
        else:
            summary_lines.append(current_line)
            current_line = word
    if current_line:
        summary_lines.append(current_line)
    
    for line in summary_lines:
        safe_line = line.encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(0, 6, safe_line, 0, 1)
    
    # Create a BytesIO buffer to hold the PDF
    buffer = io.BytesIO()
    pdf_string = pdf.output(dest='S').encode('latin-1')
    buffer.write(pdf_string)
    buffer.seek(0)
    
    return send_file(buffer, as_attachment=True, download_name="advanced_grammar_report.pdf", mimetype='application/pdf')




# Premium Features

@grammar_check_bp.route("/paraphrase", methods=["POST"])
def paraphrase_text():
    """Paraphrase text with different styles"""
    data = request.get_json()
    text = data.get("text", "")
    style = data.get("style", "standard")  # standard, formal, casual, creative
    
    # Simplified paraphrasing - in production, use advanced AI models
    paraphrase_templates = {
        "standard": [
            "Here's a rephrased version: ",
            "An alternative way to express this: ",
            "This could be rewritten as: "
        ],
        "formal": [
            "In more formal terms: ",
            "A professional version would be: ",
            "For academic or business contexts: "
        ],
        "casual": [
            "In simpler terms: ",
            "Put another way: ",
            "To say it differently: "
        ],
        "creative": [
            "A more creative approach: ",
            "With artistic flair: ",
            "Imaginatively speaking: "
        ]
    }
    
    template = random.choice(paraphrase_templates.get(style, paraphrase_templates["standard"]))
    
    # Simple word replacement for demonstration
    words = text.split()
    paraphrased_words = []
    
    for word in words:
        word_lower = word.lower()
        if word_lower in VOCABULARY_ENHANCEMENT:
            replacement = random.choice(VOCABULARY_ENHANCEMENT[word_lower])
            paraphrased_words.append(replacement)
        else:
            paraphrased_words.append(word)
    
    paraphrased_text = " ".join(paraphrased_words)
    
    return jsonify({
        "original": text,
        "paraphrased": template + paraphrased_text,
        "style": style,
        "confidence": random.randint(85, 98)
    })

@grammar_check_bp.route("/citations", methods=["POST"])
def generate_citations():
    """Generate citations for text"""
    data = request.get_json()
    text = data.get("text", "")
    style = data.get("style", "APA")  # APA, MLA, Chicago, Harvard
    
    # Mock citation generation
    citations = []
    
    # Look for potential citation-worthy content
    sentences = re.split(r'[.!?]+', text)
    for i, sentence in enumerate(sentences[:3]):  # Limit to first 3 sentences
        if len(sentence.strip()) > 20:  # Only substantial sentences
            if style == "APA":
                citation = f"Author, A. A. ({2020 + i}). Title of work. Publisher."
            elif style == "MLA":
                citation = f"Author, First. \"Title of Work.\" Publication, {2020 + i}, pp. 1-10."
            elif style == "Chicago":
                citation = f"Author, First. \"Title of Work.\" Publication {2020 + i}: 1-10."
            else:  # Harvard
                citation = f"Author, A.A., {2020 + i}. Title of work. Publisher."
            
            citations.append({
                "text": sentence.strip()[:50] + "...",
                "citation": citation,
                "type": "journal"
            })
    
    return jsonify({
        "citations": citations,
        "style": style,
        "total_found": len(citations)
    })

@grammar_check_bp.route("/ai_detector", methods=["POST"])
def detect_ai_content():
    """Detect if content is AI-generated"""
    data = request.get_json()
    text = data.get("text", "")
    
    # Mock AI detection - in production, use specialized models
    word_count = len(text.split())
    
    # Simple heuristics for demonstration
    ai_indicators = 0
    
    # Check for overly perfect grammar
    if word_count > 50 and len(re.findall(r'[.!?]', text)) / word_count > 0.1:
        ai_indicators += 1
    
    # Check for repetitive patterns
    words = text.lower().split()
    unique_words = set(words)
    if len(unique_words) / len(words) < 0.7:  # Low vocabulary diversity
        ai_indicators += 1
    
    # Check for formal language patterns
    formal_words = ['furthermore', 'moreover', 'consequently', 'therefore', 'additionally']
    formal_count = sum(1 for word in formal_words if word in text.lower())
    if formal_count > 2:
        ai_indicators += 1
    
    # Calculate probability
    ai_probability = min(95, max(5, (ai_indicators * 25) + random.randint(-10, 10)))
    
    confidence_level = "High" if ai_probability > 70 else "Medium" if ai_probability > 40 else "Low"
    
    return jsonify({
        "ai_probability": ai_probability,
        "confidence": confidence_level,
        "indicators": [
            "Consistent sentence structure" if ai_indicators > 0 else None,
            "Formal language patterns" if formal_count > 2 else None,
            "Limited vocabulary diversity" if len(unique_words) / len(words) < 0.7 else None
        ],
        "recommendation": "Human-written" if ai_probability < 50 else "Likely AI-generated"
    })

@grammar_check_bp.route("/essay_helper", methods=["POST"])
def essay_helper():
    """Provide essay writing assistance"""
    data = request.get_json()
    text = data.get("text", "")
    help_type = data.get("type", "structure")  # structure, thesis, conclusion, transitions
    
    word_count = len(text.split())
    sentence_count = len(re.findall(r'[.!?]+', text))
    
    suggestions = []
    
    if help_type == "structure":
        if word_count < 100:
            suggestions.append({
                "type": "introduction",
                "suggestion": "Consider adding a stronger introduction with a clear thesis statement.",
                "example": "Start with a hook, provide background, and state your main argument."
            })
        
        if sentence_count < 5:
            suggestions.append({
                "type": "body",
                "suggestion": "Develop your main points with supporting evidence and examples.",
                "example": "Each paragraph should focus on one main idea with supporting details."
            })
        
        suggestions.append({
            "type": "conclusion",
            "suggestion": "End with a strong conclusion that reinforces your main points.",
            "example": "Summarize key arguments and provide a final thought or call to action."
        })
    
    elif help_type == "thesis":
        suggestions.append({
            "type": "thesis",
            "suggestion": "Your thesis should clearly state your main argument or position.",
            "example": "Example: 'This essay argues that [position] because [reason 1], [reason 2], and [reason 3].'"
        })
    
    elif help_type == "transitions":
        suggestions.append({
            "type": "transitions",
            "suggestion": "Use transition words to connect your ideas smoothly.",
            "example": "Use words like 'furthermore', 'however', 'in addition', 'consequently' to link paragraphs."
        })
    
    elif help_type == "conclusion":
        suggestions.append({
            "type": "conclusion",
            "suggestion": "Restate your thesis and summarize main points without introducing new information.",
            "example": "In conclusion, this essay has demonstrated that... The evidence clearly shows..."
        })
    
    return jsonify({
        "suggestions": suggestions,
        "word_count": word_count,
        "estimated_grade": "B+" if word_count > 200 else "C+" if word_count > 100 else "C",
        "improvement_areas": [
            "Add more supporting evidence" if word_count < 300 else None,
            "Improve paragraph transitions" if sentence_count < 8 else None,
            "Strengthen conclusion" if word_count > 100 else None
        ]
    })

@grammar_check_bp.route("/auto_fix", methods=["POST"])
def auto_fix_text():
    """Automatically fix all detected errors in text"""
    data = request.get_json()
    text = data.get("text", "")
    
    if not text.strip():
        return jsonify({
            "original": text,
            "fixed": text,
            "changes": []
        })
    
    fixed_text = text
    changes = []
    
    # Fix spelling/grammar errors
    words = re.findall(r'\b\w+\b', text)
    for word in words:
        word_lower = word.lower()
        if word_lower in GRAMMAR_RULES:
            replacement = GRAMMAR_RULES[word_lower][0]  # Use first suggestion
            fixed_text = re.sub(r'\b' + re.escape(word) + r'\b', replacement, fixed_text, count=1)
            changes.append({
                "original": word,
                "fixed": replacement,
                "type": "spelling",
                "position": text.find(word)
            })
    
    # Fix conciseness issues
    for pattern, replacement in CONCISENESS_PATTERNS.items():
        matches = list(re.finditer(pattern, fixed_text, re.IGNORECASE))
        for match in matches:
            original_phrase = match.group()
            fixed_text = fixed_text.replace(original_phrase, replacement, 1)
            changes.append({
                "original": original_phrase,
                "fixed": replacement,
                "type": "conciseness",
                "position": match.start()
            })
    
    return jsonify({
        "original": text,
        "fixed": fixed_text,
        "changes": changes,
        "total_fixes": len(changes)
    })

