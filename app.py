from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import joblib
import numpy as np
import re
import nltk
from nltk.corpus import stopwords
import PyPDF2
import docx

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# File paths
MODEL_FILE = "logistic_model.pkl"
VECTORIZER_FILE = "tfidf_vectorizer.pkl"
ENCODER_FILE = "label_encoder.pkl"
UPLOAD_FOLDER = "uploads"

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load models
model = None
tfidf_vectorizer = None
label_encoder = None
STOP_WORDS = None

# Job role skill sets for skill matching
JOB_SKILLS = {
    'Data Science': ['python', 'machine learning', 'ml', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'data analysis', 'statistics', 'sql'],
    'Python Developer': ['python', 'django', 'flask', 'fastapi', 'rest api', 'postgresql', 'mongodb', 'git', 'docker'],
    'Java Developer': ['java', 'spring', 'hibernate', 'maven', 'junit', 'sql', 'rest api', 'microservices'],
    'Web Designing': ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'ui', 'ux', 'figma', 'photoshop'],
    'Machine Learning Engineer': ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'nlp', 'computer vision', 'ml ops'],
    'DevOps Engineer': ['docker', 'kubernetes', 'aws', 'azure', 'jenkins', 'ci cd', 'terraform', 'ansible', 'linux'],
    'Full Stack Developer': ['javascript', 'react', 'node', 'express', 'mongodb', 'sql', 'html', 'css', 'git', 'rest api'],
    'Data Scientist': ['python', 'r', 'machine learning', 'statistics', 'pandas', 'numpy', 'visualization', 'sql', 'deep learning'],
    'Frontend Developer': ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'typescript', 'webpack', 'sass'],
    'Backend Developer': ['python', 'java', 'node', 'sql', 'mongodb', 'rest api', 'microservices', 'redis', 'docker'],
    'Business Analyst': ['sql', 'excel', 'power bi', 'tableau', 'data analysis', 'requirements', 'agile', 'jira'],
    'Cloud Engineer': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'cloud architecture', 'networking'],
    'Mobile App Developer (iOS/Android)': ['swift', 'kotlin', 'java', 'react native', 'flutter', 'ios', 'android', 'firebase'],
    'Database': ['sql', 'mysql', 'postgresql', 'oracle', 'mongodb', 'database design', 'indexing', 'optimization'],
    'Testing': ['selenium', 'junit', 'testng', 'automation', 'manual testing', 'jira', 'api testing', 'performance testing'],
    'Network Security Engineer': ['networking', 'firewall', 'vpn', 'security', 'penetration testing', 'linux', 'wireshark'],
    'Mechanical Engineer': ['autocad', 'solidworks', 'cad', 'design', 'manufacturing', 'analysis', 'mechanics'],
    'Civil Engineer': ['autocad', 'civil 3d', 'design', 'construction', 'project management', 'structural analysis'],
    'Electrical Engineering': ['circuit design', 'plc', 'matlab', 'power systems', 'control systems', 'embedded systems'],
    'SAP Developer': ['sap', 'abap', 'fiori', 'hana', 'erp', 'integration', 'modules'],
    'Hadoop': ['hadoop', 'spark', 'hive', 'pig', 'mapreduce', 'big data', 'scala', 'kafka'],
    'ETL Developer': ['etl', 'sql', 'data warehouse', 'informatica', 'talend', 'ssis', 'data integration'],
    'Blockchain': ['blockchain', 'solidity', 'ethereum', 'smart contracts', 'web3', 'cryptocurrency'],
    'HR': ['recruitment', 'hrms', 'talent acquisition', 'employee relations', 'payroll', 'compliance'],
    'Sales': ['sales', 'crm', 'salesforce', 'negotiation', 'lead generation', 'client management'],
    'BANKING': ['banking', 'finance', 'accounting', 'risk management', 'compliance', 'financial analysis'],
    'FINANCE': ['finance', 'accounting', 'financial modeling', 'excel', 'sap', 'taxation', 'audit'],
    'ACCOUNTANT': ['accounting', 'tally', 'gst', 'taxation', 'audit', 'financial reporting', 'excel'],
    'HEALTHCARE': ['healthcare', 'medical', 'patient care', 'clinical', 'nursing', 'hospital management'],
    'TEACHER': ['teaching', 'education', 'curriculum', 'lesson planning', 'classroom management'],
    'INFORMATION-TECHNOLOGY': ['it', 'technical support', 'networking', 'troubleshooting', 'windows', 'linux'],
    'DIGITAL-MEDIA': ['digital marketing', 'seo', 'social media', 'content', 'google analytics', 'advertising'],
    'DESIGNER': ['design', 'photoshop', 'illustrator', 'figma', 'ui ux', 'creative', 'branding'],
    'CONSULTANT': ['consulting', 'business analysis', 'strategy', 'project management', 'client management'],
}


def download_nltk_data():
    """Download required NLTK data"""
    global STOP_WORDS
    try:
        STOP_WORDS = set(stopwords.words('english'))
    except LookupError:
        print("Downloading NLTK stopwords...")
        nltk.download('stopwords', quiet=True)
        STOP_WORDS = set(stopwords.words('english'))


def extract_skills(text):
    """Extract skills from resume text"""
    text_lower = text.lower()
    all_skills = set()
    for skills_list in JOB_SKILLS.values():
        all_skills.update(skills_list)
    
    found_skills = []
    for skill in all_skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.append(skill)
    
    return found_skills


def calculate_skill_match(resume_skills, job_category):
    """Calculate skill match percentage between resume and job role"""
    if job_category not in JOB_SKILLS:
        return 0.0, [], []
    
    required_skills = set(JOB_SKILLS[job_category])
    resume_skills_set = set(resume_skills)
    
    matched_skills = resume_skills_set.intersection(required_skills)
    missing_skills = required_skills - resume_skills_set
    
    if len(required_skills) == 0:
        return 0.0, [], []
    
    match_percentage = (len(matched_skills) / len(required_skills)) * 100
    
    return match_percentage, list(matched_skills), list(missing_skills)


def clean_text(text):
    """Clean and preprocess resume text"""
    global STOP_WORDS
    if STOP_WORDS is None:
        download_nltk_data()
    
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z ]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    words = [w for w in text.split() if w not in STOP_WORDS]
    return " ".join(words)


def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    text = ""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text


def extract_text_from_docx(file_path):
    """Extract text from DOCX file"""
    doc = docx.Document(file_path)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text


def extract_text_from_txt(file_path):
    """Extract text from TXT file"""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        return file.read()


def load_models():
    """Load trained models"""
    global model, tfidf_vectorizer, label_encoder
    
    if not os.path.exists(MODEL_FILE):
        raise FileNotFoundError(f"Model file '{MODEL_FILE}' not found. Please train the model first by running main.py")
    
    if not os.path.exists(VECTORIZER_FILE):
        raise FileNotFoundError(f"Vectorizer file '{VECTORIZER_FILE}' not found. Please train the model first by running main.py")
    
    if not os.path.exists(ENCODER_FILE):
        raise FileNotFoundError(f"Encoder file '{ENCODER_FILE}' not found. Please train the model first by running main.py")
    
    print("Loading trained models...")
    model = joblib.load(MODEL_FILE)
    tfidf_vectorizer = joblib.load(VECTORIZER_FILE)
    label_encoder = joblib.load(ENCODER_FILE)
    
    print("✓ Models loaded successfully")
    print(f"  - Model: Logistic Regression")
    print(f"  - Categories: {len(label_encoder.classes_)}")
    print(f"  - Features: {len(tfidf_vectorizer.vocabulary_)}")


@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    """Handle resume upload and prediction"""
    try:
        # Verify models are loaded
        if model is None or tfidf_vectorizer is None or label_encoder is None:
            return jsonify({'error': 'Models not loaded. Please restart the server.'}), 500
        
        # Check if file was uploaded
        if 'resume' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['resume']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save the uploaded file
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)
        
        # Extract text based on file type
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        
        if file_extension == 'pdf':
            resume_text = extract_text_from_pdf(file_path)
        elif file_extension == 'docx':
            resume_text = extract_text_from_docx(file_path)
        elif file_extension == 'txt':
            resume_text = extract_text_from_txt(file_path)
        else:
            return jsonify({'error': 'Unsupported file format. Please upload PDF, DOCX, or TXT'}), 400
        
        # Clean up uploaded file
        os.remove(file_path)
        
        # Check if text was extracted
        if not resume_text or len(resume_text.strip()) < 50:
            return jsonify({'error': 'Could not extract sufficient text from resume'}), 400
        
        # Extract skills from resume
        resume_skills = extract_skills(resume_text)
        
        # Clean and transform text
        cleaned_text = clean_text(resume_text)
        features = tfidf_vectorizer.transform([cleaned_text])
        
        # Make prediction
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]
        
        # Get top 3 predictions
        top_3_idx = np.argsort(probabilities)[-3:][::-1]
        top_3_categories = label_encoder.inverse_transform(top_3_idx)
        top_3_probabilities = probabilities[top_3_idx]
        
        # Prepare top 3 recommendations with skill matching
        recommendations = []
        for cat, prob in zip(top_3_categories, top_3_probabilities):
            match_pct, matched_skills, missing_skills = calculate_skill_match(resume_skills, cat)
            
            recommendations.append({
                'role': cat,
                'confidence': float(prob),
                'skill_match': float(match_pct),
                'matched_skills': matched_skills[:5],  # Top 5 matched skills
                'missing_skills': missing_skills[:5] if len(recommendations) == 0 else []  # Only for top role
            })
        
        # Prepare response
        response = {
            'primary_role': recommendations[0]['role'],
            'primary_confidence': recommendations[0]['confidence'],
            'recommendations': recommendations,
            'extracted_skills': resume_skills[:10]  # Show top 10 skills
        }
        
        return jsonify(response)
    
    except Exception as e:
        import traceback
        print(f"\n❌ Error occurred during prediction:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Traceback:")
        traceback.print_exc()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'models_loaded': model is not None})


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("Resume Screening AI Web App")
    print("=" * 60)
    
    # Download NLTK data first
    print("\nInitializing NLTK data...")
    download_nltk_data()
    print("✓ NLTK data ready")
    
    # Load models
    try:
        load_models()
        print("\n" + "=" * 60)
        print("🚀 Starting server...")
        print("📱 Open your browser and go to: http://localhost:5000")
        print("\n" + "=" * 60)
        app.run(debug=True, host='0.0.0.0', port=5000)
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease run 'python main.py' first to train the model!")
