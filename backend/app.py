import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModel, pipeline, AutoModelForSequenceClassification
from data_connector import preprocess_text 
from data_connector import preprocess_text 
import os
import time
import json
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F

# --- Production Logging Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SmartTicket-Backend")

app = Flask(__name__)
CORS(app)

# --- Path Configuration (Relative to Script Location) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')

EMBEDDING_MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
CLEANED_DATA_FILE = os.path.join(DATA_DIR, 'registry', 'knowledge_base_with_embeddings.csv')
EMBEDDINGS_FILE = os.path.join(DATA_DIR, 'registry', 'kb_embeddings.npy')
RESOLUTIONS_FILE = os.path.join(DATA_DIR, 'registry', 'ticket_resolutions.csv')
LOG_FILE_PATH = os.path.join(DATA_DIR, 'logs', 'usage_log.jsonl')
FINE_TUNED_ISSUE_DIR = os.path.join(DATA_DIR, 'models', 'fine_tuned_model_issue')
FINE_TUNED_TEAM_DIR = os.path.join(DATA_DIR, 'models', 'fine_tuned_model_team')

# --- Resource State ---
KB_ARTICLES = None
KB_EMBEDDINGS = None
KB_RESOLUTIONS = None
RECOMMENDATION_MODEL = None
RECOMMENDATION_TOKENIZER = None
SEVERITY_CLASSIFIER = None
ISSUE_MODEL = None
ISSUE_TOKENIZER = None
TEAM_MODEL = None
TEAM_TOKENIZER = None

def load_resources():
    """Diagnostic neural resource loader."""
    global KB_ARTICLES, KB_EMBEDDINGS, RECOMMENDATION_MODEL, RECOMMENDATION_TOKENIZER
    global SEVERITY_CLASSIFIER, ISSUE_MODEL, ISSUE_TOKENIZER, TEAM_MODEL, TEAM_TOKENIZER
    global KB_RESOLUTIONS
    
    success = True
    logger.info("Initializing Neural Registry...")

    try:
        KB_ARTICLES = pd.read_csv(CLEANED_DATA_FILE, sep='|', dtype={'Ticket ID': str})
        KB_EMBEDDINGS = np.load(EMBEDDINGS_FILE)
        logger.info(f"Loaded {len(KB_ARTICLES)} KB articles.")
    except Exception as e:
        logger.error(f"KB Resource Load Failed: {e}")
        success = False

    try:
        res_df = pd.read_csv(RESOLUTIONS_FILE, dtype={'Ticket ID': str})
        KB_RESOLUTIONS = res_df.set_index('Ticket ID')['Resolution Steps'].to_dict()
    except Exception as e:
        logger.warning(f"Resolution steps unavailable: {e}")
        KB_RESOLUTIONS = {}

    try:
        RECOMMENDATION_TOKENIZER = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
        RECOMMENDATION_MODEL = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
        RECOMMENDATION_MODEL.eval()
        
        # Load Fine-tuned Classifiers
        if os.path.exists(FINE_TUNED_TEAM_DIR):
            TEAM_MODEL = AutoModelForSequenceClassification.from_pretrained(FINE_TUNED_TEAM_DIR)
            TEAM_TOKENIZER = AutoTokenizer.from_pretrained(FINE_TUNED_TEAM_DIR)
        
        if os.path.exists(FINE_TUNED_ISSUE_DIR):
            ISSUE_MODEL = AutoModelForSequenceClassification.from_pretrained(FINE_TUNED_ISSUE_DIR)
            ISSUE_TOKENIZER = AutoTokenizer.from_pretrained(FINE_TUNED_ISSUE_DIR)
        else:
            ISSUE_MODEL, ISSUE_TOKENIZER = TEAM_MODEL, TEAM_TOKENIZER

        SEVERITY_CLASSIFIER = pipeline(
            "text-classification",
            model="bhadresh-savani/distilbert-base-uncased-emotion",
            tokenizer="bhadresh-savani/distilbert-base-uncased-emotion"
        )
        logger.info("Neural classification pipeline online.")
    except Exception as e:
        logger.error(f"Model Ingestion Failed: {e}")
        success = False

    return success

# --- Neural Utility Methods ---

def get_query_embedding(text):
    if not (RECOMMENDATION_TOKENIZER and RECOMMENDATION_MODEL): return None
    pre_text = preprocess_text(text)
    inputs = RECOMMENDATION_TOKENIZER(pre_text, padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        outputs = RECOMMENDATION_MODEL(**inputs)
    embedding = outputs.last_hidden_state.mean(dim=1)
    return F.normalize(embedding, p=2, dim=1).squeeze().numpy().astype(np.float64)

def predict_category(text, model, tokenizer):
    if not (model and tokenizer): return {'label': 'N/A', 'score': 0.0}
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.nn.functional.softmax(logits, dim=-1)
    idx = torch.argmax(logits, dim=-1).item()
    return {'label': model.config.id2label[idx], 'score': float(round(probs[0][idx].item(), 4))}

def predict_severity_mock(text, classifier):
    if not classifier: return {'label': 'N/A', 'score': 0.0}
    try:
        res = classifier(text[:1000], truncation=True)[0]
        emotion = res['label'].lower()
        mapping = {'anger': 'Critical', 'sadness': 'Critical', 'fear': 'Critical', 'surprise': 'High', 'joy': 'Low'}
        return {'label': mapping.get(emotion, 'Medium'), 'score': float(round(res['score'], 4))}
    except Exception as e:
        logger.error(f"Severity parse error: {e}")
        return {'label': 'Medium', 'score': 0.0}

# --- Neural Integration Skeletons (Ready for Future Activation) ---

def send_slack_recommendation(ticket_id, suggestions, severity, issue, team):
    """
    Dormant Slack dispatcher. 
    To activate: Install slack_sdk and initialize WebClient with a valid BOT_TOKEN.
    """
    if severity not in ['Critical', 'High']: return False
    
    # Placeholder for future Slack Integration
    logger.info(f"INTEGRATION-HOOK [Slack]: Ticket {ticket_id} flagged for notification. (Integration currently Dormant)")
    return True

# --- API Routes ---

@app.route("/slack_activity", methods=["GET"])
def get_slack_activity():
    """Returns an empty state to signal no active integration."""
    return jsonify({"messages": []})

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    text = data.get('ticket_text', '')
    t_id = data.get('ticket_id', f"TKT-{int(time.time() * 100) % 10000}")
    
    if not text or KB_EMBEDDINGS is None:
        return jsonify({"error": "Neural registry offline"}), 500
    
    emb = get_query_embedding(text)
    sev = predict_severity_mock(text, SEVERITY_CLASSIFIER)
    iss = predict_category(text, ISSUE_MODEL, ISSUE_TOKENIZER)
    team = predict_category(text, TEAM_MODEL, TEAM_TOKENIZER)
    
    sims = np.dot(KB_EMBEDDINGS, emb)
    top_indices = np.argsort(sims)[::-1][:5]
    suggestions = []
    
    for i in top_indices:
        if sims[i] > 0.5:
            art = KB_ARTICLES.iloc[i]
            art_id = str(art.get('Ticket ID', i))
            suggestions.append({
                "article_id": art_id,
                "title": art.get('Subject', 'No Subject'),
                "similarity_score": float(round(sims[i], 4)),
                "summary": art.get('Full_Ticket_Text', 'N/A')[:100] + '...',
                "resolution_steps": KB_RESOLUTIONS.get(art_id, "Standard SOP recommended.")
            })
    
    slack_status = send_slack_recommendation(t_id, suggestions, sev['label'], iss['label'], team['label'])
    
    return jsonify({
        "suggestions": suggestions,
        "severity_prediction": sev,
        "issue_prediction": iss,
        "team_prediction": team,
        "slack_sent": slack_status
    })

@app.route('/bulk_recommend', methods=['POST'])
def bulk_recommend():
    try:
        tickets = request.get_json().get('tickets', [])
        results = []
        for t in tickets:
            tx = t.get('ticket_text', '')
            if not tx: continue
            results.append({
                "ticket_id": str(t.get('ticket_id', 'BN')),
                "ticket_text": tx,
                "suggestions": [],
                "severity_prediction": predict_severity_mock(tx, SEVERITY_CLASSIFIER),
                "issue_prediction": predict_category(tx, ISSUE_MODEL, ISSUE_TOKENIZER),
                "team_prediction": predict_category(tx, TEAM_MODEL, TEAM_TOKENIZER),
                "timestamp": time.strftime("%H:%M:%S")
            })
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    if load_resources():
        # Using 0.0.0.0 to allow access from other machines/containers on the network
        app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
    else:
        logger.critical("Neural Dashboard failed to initialize resources.")

