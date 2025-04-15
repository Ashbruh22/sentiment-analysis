from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import logging
import os
import torch
import time
import json
import sqlite3
from datetime import datetime

# Settings and Database Configuration
SETTINGS_FILE = 'settings.json'
DATABASE_FILE = 'reviews.db'

# Initialize database
def init_db():
    conn = sqlite3.connect(DATABASE_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            sentiment_score REAL,
            star_rating INTEGER DEFAULT 0,
            language TEXT DEFAULT 'English',
            username TEXT DEFAULT 'Anonymous',
            helpful_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if we need to add sample data
    c.execute('SELECT COUNT(*) FROM reviews')
    count = c.fetchone()[0]
    
    if count == 0:
        # Add sample reviews
        sample_reviews = [
            ('Great product! Exactly what I needed.', 'Positive', 0.95, 5, 'English', 'John', 3),
            ('Not worth the money.', 'Negative', 0.2, 2, 'English', 'Alice', 1),
            ('It works as expected.', 'Neutral', 0.5, 3, 'English', 'Bob', 0),
            ('Could be better.', 'Neutral', 0.4, 3, 'English', 'Emma', 2)
        ]
        
        c.executemany('''
            INSERT INTO reviews (text, sentiment, sentiment_score, star_rating, language, username, helpful_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', sample_reviews)
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Default settings
DEFAULT_SETTINGS = {
    'sentiment_api_key': '8e72jd7-demo-key',
    'sarcasm_api_key': '',
    'language_api_key': 'lang-demo-3892',
    'negative_threshold': 20,
    'sarcasm_confidence': 75
}

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

HOST = '0.0.0.0'
PORT = 5000

# Settings management
def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        return DEFAULT_SETTINGS.copy()
    except Exception as e:
        logger.error(f"Error loading settings: {str(e)}")
        return DEFAULT_SETTINGS.copy()

def save_settings(settings):
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {str(e)}")
        return False

@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(load_settings())

@app.route('/api/rate', methods=['POST'])
def rate_review():
    try:
        data = request.json
        review_id = data.get('reviewId')
        rating = data.get('rating')

        if not review_id or not isinstance(rating, (int, float)) or not (0 <= rating <= 5):
            return jsonify({'success': False, 'error': 'Invalid rating data'}), 400

        conn = sqlite3.connect(DATABASE_FILE)
        c = conn.cursor()
        c.execute('UPDATE reviews SET star_rating = ? WHERE id = ?', (rating, review_id))
        conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating rating: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    try:
        sentiment = request.args.get('sentiment', 'all')
        rating = int(request.args.get('rating', 0))
        language = request.args.get('language', 'all')
        search = request.args.get('search', '')

        conn = sqlite3.connect(DATABASE_FILE)
        c = conn.cursor()

        query = 'SELECT * FROM reviews WHERE 1=1'
        params = []

        if sentiment != 'all':
            query += ' AND sentiment = ?'
            params.append(sentiment)

        if rating > 0:
            query += ' AND star_rating >= ?'
            params.append(rating)

        if language != 'all':
            query += ' AND language = ?'
            params.append(language)

        if search:
            query += ' AND text LIKE ?'
            params.append(f'%{search}%')

        query += ' ORDER BY created_at DESC'

        c.execute(query, params)
        # Get column names from cursor description
        columns = [description[0] for description in c.description]
        
        # Map row data to column names safely
        reviews = []
        for row in c.fetchall():
            review_dict = {}
            for i, column in enumerate(columns):
                review_dict[column] = row[i] if i < len(row) else None
            reviews.append(review_dict)

        conn.close()
        return jsonify({'success': True, 'reviews': reviews})

    except Exception as e:
        logger.error(f'Error fetching reviews: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reviews/helpful', methods=['POST'])
def update_helpful_count():
    try:
        data = request.json
        review_id = data.get('reviewId')
        increment = data.get('increment', True)

        if not review_id:
            return jsonify({'success': False, 'error': 'Review ID is required'}), 400

        conn = sqlite3.connect(DATABASE_FILE)
        c = conn.cursor()
        
        if increment:
            c.execute('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?', (review_id,))
        else:
            c.execute('UPDATE reviews SET helpful_count = CASE WHEN helpful_count > 0 THEN helpful_count - 1 ELSE 0 END WHERE id = ?', (review_id,))

        conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Error updating helpful count: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    try:
        new_settings = request.json
        current_settings = load_settings()
        current_settings.update(new_settings)
        
        if save_settings(current_settings):
            return jsonify({'status': 'success', 'settings': current_settings})
        return jsonify({'status': 'error', 'message': 'Failed to save settings'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

# Global model variables
sentiment_tokenizer = None
sentiment_model = None
sarcasm_model = None
sarcasm_tokenizer = None
sentiment_labels = ['negative', 'neutral', 'positive']
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize models
def store_review(text, sentiment_result):
    conn = sqlite3.connect(DATABASE_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO reviews (text, sentiment, sentiment_score)
        VALUES (?, ?, ?)
    ''', (text, sentiment_result['label'], sentiment_result['score']))
    conn.commit()
    conn.close()

def get_review_stats():
    conn = sqlite3.connect(DATABASE_FILE)
    c = conn.cursor()
    
    # Get total reviews count
    c.execute('SELECT COUNT(*) FROM reviews')
    total_reviews = c.fetchone()[0]
    
    # Get sentiment distribution
    c.execute('''
        SELECT sentiment, COUNT(*) 
        FROM reviews 
        GROUP BY sentiment
    ''')
    sentiment_counts = dict(c.fetchall())
    
    conn.close()
    return {
        'total_reviews': total_reviews,
        'sentiment_distribution': sentiment_counts
    }

def analyze_sentiment(text):
    # Enhanced preprocessing for better negative sentiment detection
    text = text.lower().replace("not ", "not_").replace("n't ", "n't_")  # Preserve negations
    
    # Additional negation handling for improved accuracy
    negation_words = ['never', 'no', 'nothing', 'nowhere', 'none', 'nobody', 'neither', 'nor']
    for word in negation_words:
        text = text.replace(f"{word} ", f"{word}_")
    
    inputs = sentiment_tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(device)
    with torch.no_grad():
        outputs = sentiment_model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    
    # Enhanced negative sentiment detection with dynamic weighting
    if sentiment_labels[torch.argmax(probs)] == 'negative':
        boost_factor = 1.2 if any(word in text for word in negation_words) else 1.15
        probs[0][torch.argmax(probs)] *= boost_factor
    
    result = {
        'label': sentiment_labels[torch.argmax(probs)],
        'score': round(torch.max(probs).item(), 4),
        'full_distribution': {
            sentiment_labels[i]: round(probs[0][i].item() * 100, 2)
            for i in range(len(sentiment_labels))
        }
    }
    return result

def detect_sarcasm(text, model=None, tokenizer=None):
    model = model or sarcasm_model
    tokenizer = tokenizer or sarcasm_tokenizer
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512).to(device)
    outputs = model(**inputs)
    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
    sarcasm_score = predictions[0][1].item()
    return max(0.0, min(1.0, sarcasm_score))

def load_models():
    global sentiment_model, sentiment_tokenizer, sarcasm_model, sarcasm_tokenizer

    try:
        # Check if CUDA is available and set device accordingly
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {device}")

        # Load sentiment model with error handling
        logger.info("Loading sentiment model (Twitter-RoBERTa)...")
        try:
            sentiment_tokenizer = AutoTokenizer.from_pretrained(
                "cardiffnlp/twitter-roberta-base-sentiment",
                local_files_only=False
            )
            sentiment_model = AutoModelForSequenceClassification.from_pretrained(
                "cardiffnlp/twitter-roberta-base-sentiment",
                local_files_only=False
            )
            sentiment_model.to(device)
            sentiment_model.eval()  # Set to evaluation mode
        except Exception as e:
            logger.error(f"Failed to load sentiment model: {str(e)}")
            raise

        # Load sarcasm model with error handling
        logger.info("Loading sarcasm model...")
        try:
            sarcasm_tokenizer = AutoTokenizer.from_pretrained(
                "microsoft/deberta-v3-base",
                local_files_only=False
            )
            sarcasm_model = AutoModelForSequenceClassification.from_pretrained(
                "microsoft/deberta-v3-base",
                num_labels=2,
                local_files_only=False
            )
            sarcasm_model.to(device)
            sarcasm_model.eval()  # Set to evaluation mode
        except Exception as e:
            logger.error(f"Failed to load sarcasm model: {str(e)}")
            raise

        # Warm up both models with proper error handling
        try:
            with torch.no_grad():
                _ = analyze_sentiment("Hello world")
                _ = detect_sarcasm("This is so great I could cry.")
        except Exception as e:
            logger.error(f"Model warm-up failed: {str(e)}")
            raise

        logger.info("Models loaded and warmed up successfully.")
        return True

    except Exception as e:
        logger.error(f"Model loading failed: {str(e)}")
        sentiment_model = sentiment_tokenizer = sarcasm_model = sarcasm_tokenizer = None
        return False

# Load models on startup
if not load_models():
    logger.error("Failed to initialize models at startup")

def adjust_sentiment_for_sarcasm(sentiment, sarcasm_score):
    if sarcasm_score > 0.6:
        if sentiment['label'] == 'positive':
            sentiment['label'] = 'sarcastically positive (actually negative)'
            sentiment['score'] = 1 - sentiment['score']  # Invert confidence for sarcastic positives
        elif sentiment['label'] == 'neutral':
            sentiment['label'] = 'potentially negative'
            sentiment['score'] = min(sentiment['score'] + 0.25, 1.0)  # Stronger boost for neutral-to-negative
    
    # More nuanced negative sentiment handling
    if sentiment['label'] == 'negative':
        if sentiment['score'] < 0.7:
            sentiment['score'] = min(sentiment['score'] + 0.2, 1.0)  # Increased boost for weak negatives
        elif sentiment['score'] < 0.85:
            sentiment['score'] = min(sentiment['score'] + 0.1, 1.0)  # Moderate boost for medium negatives
    
    return sentiment





@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    # Initialize response structure
    response = {
        'success': False,
        'error': None,
        'details': None,
        'data': None
    }

    # Check if models are initialized
    if not (sentiment_model and sarcasm_model):
        try:
            if not load_models():
                response.update({
                    'error': 'Model initialization failed',
                    'details': 'Failed to load required models. Please try again later.'
                })
                return jsonify(response), 503  # Service Unavailable
        except Exception as e:
            logger.error(f"Model loading error: {e}")
            response.update({
                'error': 'Model initialization error',
                'details': 'An error occurred while loading the models'
            })
            return jsonify(response), 500

    try:
        # Validate request data
        data = request.get_json()
        if not data:
            response.update({
                'error': 'Invalid request format',
                'details': 'Request must contain valid JSON data'
            })
            return jsonify(response), 400

        # Extract and validate text input
        text = data.get('text', '').strip()
        language = data.get('language', 'en')

        if not text:
            response.update({
                'error': 'Invalid input',
                'details': 'Text field cannot be empty'
            })
            return jsonify(response), 400

        if not isinstance(text, str):
            response.update({
                'error': 'Invalid input type',
                'details': 'Text must be a string'
            })
            return jsonify(response), 400

        try:
            # Perform analysis
            sentiment_result = analyze_sentiment(text)
            sarcasm_score = detect_sarcasm(text, sarcasm_model, sarcasm_tokenizer)
            adjusted_sentiment = adjust_sentiment_for_sarcasm(sentiment_result.copy(), sarcasm_score)

            # Store results
            store_review(text, adjusted_sentiment)

            # Prepare success response
            response.update({
                'success': True,
                'data': {
                    'sentiment': adjusted_sentiment,
                    'sarcasm': {
                        'score': round(sarcasm_score, 4),
                        'is_sarcastic': sarcasm_score > 0.5
                    },
                    'language': language,
                    'stats': get_review_stats()
                }
            })
            return jsonify(response), 200

        except RuntimeError as e:
            logger.error(f"Analysis runtime error: {e}")
            response.update({
                'error': 'Analysis execution failed',
                'details': 'An error occurred while processing the text'
            })
            return jsonify(response), 500

    except Exception as e:
        logger.error(f"Endpoint error: {e}")
        response.update({
            'error': 'Server error',
            'details': 'An internal server error occurred'
        })
        return jsonify(response), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        stats = get_review_stats()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch stats', 'details': str(e)}), 500
    # Initialize response structure
    response = {
        'success': False,
        'error': None,
        'details': None,
        'data': None
    }

    # Check if models are initialized
    if not hasattr(app, 'models_loaded'):
        app.models_loaded = False

    if not app.models_loaded:
        try:
            app.models_loaded = load_models()
            if not app.models_loaded:
                response.update({
                    'error': 'Model initialization failed',
                    'details': 'Failed to load required models. Please try again later.'
                })
                return jsonify(response), 503  # Service Unavailable
        except Exception as e:
            logger.error(f"Model loading error: {e}")
            response.update({
                'error': 'Model initialization error',
                'details': 'An error occurred while loading the models'
            })
            return jsonify(response), 500

    try:
        # Validate request data
        data = request.get_json()
        if not data:
            response.update({
                'error': 'Invalid request format',
                'details': 'Request must contain valid JSON data'
            })
            return jsonify(response), 400

        # Extract and validate text input
        text = data.get('text', '').strip()
        language = data.get('language', 'en')

        if not text:
            response.update({
                'error': 'Invalid input',
                'details': 'Text field cannot be empty'
            })
            return jsonify(response), 400

        if not isinstance(text, str):
            response.update({
                'error': 'Invalid input type',
                'details': 'Text must be a string'
            })
            return jsonify(response), 400

        try:
            # Perform analysis
            sentiment_result = analyze_sentiment(text)
            sarcasm_score = detect_sarcasm(text, sarcasm_model, sarcasm_tokenizer)
            sentiment_result = adjust_sentiment_for_sarcasm(sentiment_result, sarcasm_score)

            # Store results
            store_review(text, sentiment_result)

            # Prepare success response
            response.update({
                'success': True,
                'data': {
                    'sentiment': sentiment_result,
                    'sarcasm': {
                        'score': round(sarcasm_score, 4),
                        'is_sarcastic': sarcasm_score > 0.5
                    },
                    'language': language,
                    'stats': get_review_stats()
                }
            })
            return jsonify(response), 200

        except RuntimeError as e:
            logger.error(f"Analysis runtime error: {e}")
            response.update({
                'error': 'Analysis execution failed',
                'details': 'An error occurred while processing the text'
            })
            return jsonify(response), 500

        except Exception as e:
            logger.error(f"Analysis error: {e}")
            response.update({
                'error': 'Analysis failed',
                'details': 'An unexpected error occurred during analysis'
            })
            return jsonify(response), 500

    except Exception as e:
        logger.error(f"Endpoint error: {e}")
        response.update({
            'error': 'Server error',
            'details': 'An internal server error occurred'
        })
        return jsonify(response), 500

@app.route('/api/languages', methods=['GET'])
def get_supported_languages():
    # List of supported languages including Indian regional languages
    languages = [
        {'code': 'en', 'name': 'English'},
        {'code': 'hi', 'name': 'Hindi'},
        {'code': 'bn', 'name': 'Bengali'},
        {'code': 'ta', 'name': 'Tamil'},
        {'code': 'te', 'name': 'Telugu'},
        {'code': 'mr', 'name': 'Marathi'},
        {'code': 'gu', 'name': 'Gujarati'},
        {'code': 'kn', 'name': 'Kannada'},
        {'code': 'ml', 'name': 'Malayalam'},
        {'code': 'pa', 'name': 'Punjabi'},
        {'code': 'it', 'name': 'Italian'},
        {'code': 'pt', 'name': 'Portuguese'},
        {'code': 'nl', 'name': 'Dutch'},
        {'code': 'pl', 'name': 'Polish'},
        {'code': 'zh', 'name': 'Chinese'},
        {'code': 'ja', 'name': 'Japanese'}
    ]
    return jsonify(languages)

if __name__ == '__main__':
    if sentiment_model is None or sarcasm_model is None:
        logger.error("Models not loaded. Aborting.")
        exit(1)

    logger.info(f"Server starting on http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=True)