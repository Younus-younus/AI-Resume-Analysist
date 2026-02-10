import os
import pandas as pd
import numpy as np
import joblib
import re
import nltk
from nltk.corpus import stopwords

from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# File paths
MODEL_FILE = "logistic_model.pkl"
VECTORIZER_FILE = "tfidf_vectorizer.pkl"
ENCODER_FILE = "label_encoder.pkl"
DATA_FILE = "Resume.csv"

# Allowed categories
ALLOWED_CATEGORIES = [
    'BANKING', 'ARTS', 'AVIATION', 'Data Science', 'Advocate', 'Arts',
    'Web Designing', 'Mechanical Engineer', 'Sales', 'Health and fitness',
    'Civil Engineer', 'Java Developer', 'Business Analyst', 'SAP Developer',
    'Automation Testing', 'Electrical Engineering', 'Operations Manager',
    'Python Developer', 'DevOps Engineer', 'Network Security Engineer', 'PMO',
    'Database', 'Hadoop', 'ETL Developer', 'DotNet Developer', 'Blockchain',
    'Testing', 'Frontend Developer', 'Backend Developer', 'Data Scientist',
    'Full Stack Developer', 'Mobile App Developer (iOS/Android)',
    'Machine Learning Engineer', 'Cloud Engineer', 'FINANCE', 'APPAREL', 
    'ENGINEERING', 'ACCOUNTANT', 'CONSTRUCTION', 'HR', 'DESIGNER', 
    'INFORMATION-TECHNOLOGY', 'TEACHER', 'ADVOCATE', 'BUSINESS-DEVELOPMENT', 
    'HEALTHCARE', 'FITNESS', 'AGRICULTURE', 'BPO', 'SALES', 'CONSULTANT', 
    'DIGITAL-MEDIA', 'AUTOMOBILE', 'CHEF'
]


def download_nltk_data():
    """Download required NLTK data"""
    try:
        stopwords.words('english')
    except LookupError:
        print("Downloading NLTK stopwords...")
        nltk.download('stopwords')


# Load stopwords once (more efficient)
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

def extract_skills(text):
    """Extract skills from resume text"""
    text_lower = text.lower()
    
    # Common technical skills to look for
    all_skills = set()
    for skills_list in JOB_SKILLS.values():
        all_skills.update(skills_list)
    
    found_skills = []
    for skill in all_skills:
        # Use word boundaries to avoid partial matches
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
        STOP_WORDS = set(stopwords.words('english'))
    
    text = str(text).lower()                      # lowercase
    text = re.sub(r'[^a-zA-Z ]', ' ', text)      # remove numbers & symbols
    text = re.sub(r'\s+', ' ', text)             # remove extra spaces
    words = [w for w in text.split() if w not in STOP_WORDS]  # remove stopwords
    return " ".join(words)


def load_and_prepare_data(file_path):
    """Load and prepare resume data"""
    print(f"Loading data from {file_path}...")
    df = pd.read_csv(file_path)
    
    print("Cleaning resume text...")
    df['cleaned_resume'] = df['resume_text'].apply(clean_text)
    
    # Create working dataframe
    df2 = pd.DataFrame(df, columns=["category", "cleaned_resume"])
    
    # Filter allowed categories
    df2 = df2[df2['category'].isin(ALLOWED_CATEGORIES)].copy()
    
    print(f"Data prepared: {len(df2)} records, {df2['category'].nunique()} unique categories")
    return df2


if not os.path.exists(MODEL_FILE):
    # TRAINING PHASE
    print("=" * 60)
    print("TRAINING PHASE")
    print("=" * 60)
    
    # Download NLTK data
    download_nltk_data()
    
    # Load and prepare data
    df = load_and_prepare_data(DATA_FILE)
    
    # Encode categories
    print("\nEncoding categories...")
    label_encoder = LabelEncoder()
    df['category_encoded'] = label_encoder.fit_transform(df['category'])
    
    print(f"Number of categories: {len(label_encoder.classes_)}")
    print(f"Categories: {list(label_encoder.classes_)[:10]}...")  # Show first 10
    
    # Convert text to TF-IDF features
    print("\nCreating TF-IDF features...")
    tfidf_vectorizer = TfidfVectorizer(
        max_features=7000,
        ngram_range=(1, 2),   # unigrams + bigrams for better context
        min_df=2,             # ignore terms that appear in less than 2 documents
        max_df=0.9            # ignore terms that appear in more than 90% of documents
    )
    X = tfidf_vectorizer.fit_transform(df['cleaned_resume'])
    y = df['category_encoded']
    
    print(f"Feature matrix shape: {X.shape}")
    
    # Split data
    print("\nSplitting data into train and test sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Train Logistic Regression model
    print("\nTraining Logistic Regression model...")
    model = LogisticRegression(
        max_iter=2000,
        solver='saga',           # more stable for large sparse text data
        class_weight='balanced', # handles class imbalance
        n_jobs=-1,              # use all CPU cores
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate model
    print("\n" + "=" * 60)
    print("MODEL EVALUATION")
    print("=" * 60)
    
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    train_accuracy = accuracy_score(y_train, y_train_pred)
    test_accuracy = accuracy_score(y_test, y_test_pred)
    
    print(f"\nTraining Accuracy: {train_accuracy:.4f}")
    print(f"Test Accuracy: {test_accuracy:.4f}")
    
    print("\nClassification Report (Test Set):")
    print(classification_report(y_test, y_test_pred, 
                               target_names=label_encoder.classes_,
                               zero_division=0))
    
    # Save model, vectorizer, and encoder
    print("\n" + "=" * 60)
    print("SAVING MODELS")
    print("=" * 60)
    
    joblib.dump(model, MODEL_FILE)
    print(f"✓ Model saved to: {MODEL_FILE}")
    
    joblib.dump(tfidf_vectorizer, VECTORIZER_FILE)
    print(f"✓ Vectorizer saved to: {VECTORIZER_FILE}")
    
    joblib.dump(label_encoder, ENCODER_FILE)
    print(f"✓ Label Encoder saved to: {ENCODER_FILE}")
    
    # Save test data for inference testing
    test_indices = y_test.index
    test_df = pd.DataFrame({
        'resume_text': df.loc[test_indices, 'cleaned_resume'].values,
        'actual_category': label_encoder.inverse_transform(y_test)
    })
    test_df.to_csv("test_input.csv", index=False)
    print(f"✓ Test data saved to: test_input.csv")
    
    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)

else:
    # INFERENCE PHASE
    print("=" * 60)
    print("INFERENCE PHASE")
    print("=" * 60)
    
    # Download NLTK data
    download_nltk_data()
    
    print("\nLoading saved model, vectorizer, and encoder...")
    model = joblib.load(MODEL_FILE)
    tfidf_vectorizer = joblib.load(VECTORIZER_FILE)
    label_encoder = joblib.load(ENCODER_FILE)
    
    print(f"✓ Model loaded from: {MODEL_FILE}")
    print(f"✓ Vectorizer loaded from: {VECTORIZER_FILE}")
    print(f"✓ Label Encoder loaded from: {ENCODER_FILE}")
    
    # Check if test input file exists
    if os.path.exists("test_input.csv"):
        print(f"\nLoading test data from: test_input.csv")
        input_data = pd.read_csv("test_input.csv")
        
        # Clean text if not already cleaned
        if 'resume_text' in input_data.columns:
            print("Preprocessing resume text...")
            input_data['cleaned_resume'] = input_data['resume_text'].apply(clean_text)
        
        # Transform and predict
        print("Making predictions...")
        X_input = tfidf_vectorizer.transform(input_data['cleaned_resume'])
        predictions = model.predict(X_input)
        probabilities = model.predict_proba(X_input)
        
        # Get predicted categories
        predicted_categories = label_encoder.inverse_transform(predictions)
        
        # Get confidence scores (max probability for each prediction)
        confidence_scores = probabilities.max(axis=1)
        
        # Extract skills and calculate matches
        print("Calculating skill matches...")
        skill_matches = []
        matched_skills_list = []
        
        for idx, row in input_data.iterrows():
            resume_skills = extract_skills(row['cleaned_resume'])
            match_pct, matched, _ = calculate_skill_match(resume_skills, predicted_categories[idx])
            skill_matches.append(match_pct)
            matched_skills_list.append(', '.join(matched[:5]) if matched else 'None')
        
        # Add predictions to output
        input_data['predicted_category'] = predicted_categories
        input_data['confidence'] = confidence_scores
        input_data['skill_match_percentage'] = skill_matches
        input_data['matched_skills'] = matched_skills_list
        
        # Get top 3 predictions for each resume
        top_3_predictions = []
        for prob_row in probabilities:
            top_3_idx = np.argsort(prob_row)[-3:][::-1]
            top_3_cats = label_encoder.inverse_transform(top_3_idx)
            top_3_probs = prob_row[top_3_idx]
            top_3_str = ' | '.join([f"{cat} ({prob:.2%})" for cat, prob in zip(top_3_cats, top_3_probs)])
            top_3_predictions.append(top_3_str)
        
        input_data['top_3_recommendations'] = top_3_predictions
        
        # Calculate accuracy if actual categories are available
        if 'actual_category' in input_data.columns:
            accuracy = accuracy_score(input_data['actual_category'], predicted_categories)
            print(f"\nAccuracy on test set: {accuracy:.4f}")
            
            print("\n" + "=" * 80)
            print("Sample Predictions with Skill Matching:")
            print("=" * 80)
            sample = input_data[['actual_category', 'predicted_category', 'confidence', 'skill_match_percentage']].head(5)
            print(sample.to_string(index=False))
            
            print("\n" + "=" * 80)
            print("Top 3 Recommendations for First Resume:")
            print("=" * 80)
            print(input_data['top_3_recommendations'].iloc[0])
        else:
            print("\n" + "=" * 80)
            print("Sample Predictions with Skill Matching:")
            print("=" * 80)
            sample = input_data[['predicted_category', 'confidence', 'skill_match_percentage']].head(5)
            print(sample.to_string(index=False))
        
        # Save results
        input_data.to_csv("predictions_output.csv", index=False)
        print(f"\n✓ Predictions saved to: predictions_output.csv")
        print(f"✓ Total predictions: {len(predictions)}")
        
    else:
        # Example prediction with sample resume
        print("\nNo test_input.csv found. Running example prediction...")
        
        sample_resume = """
        Experienced software developer with 5 years of Python programming.
        Strong background in machine learning and data science. Proficient in
        scikit-learn, TensorFlow, and pandas. Built multiple ML models for 
        production environments. Experience with cloud platforms like AWS.
        Skilled in SQL, data analysis, and visualization.
        """
        
        print("\nSample Resume:")
        print("-" * 60)
        print(sample_resume.strip())
        print("-" * 60)
        
        # Extract skills from resume
        resume_skills = extract_skills(sample_resume)
        print(f"\n📋 Extracted Skills: {', '.join(resume_skills) if resume_skills else 'None'}")
        
        # Clean and transform
        cleaned = clean_text(sample_resume)
        features = tfidf_vectorizer.transform([cleaned])
        
        # Predict
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]
        
        # Get results
        predicted_category = label_encoder.inverse_transform([prediction])[0]
        confidence = probabilities[prediction]
        
        # Get top 3 predictions
        top_3_idx = np.argsort(probabilities)[-3:][::-1]
        top_3_categories = label_encoder.inverse_transform(top_3_idx)
        top_3_probabilities = probabilities[top_3_idx]
        
        print("\n" + "=" * 60)
        print("🎯 TOP 3 JOB ROLE RECOMMENDATIONS (LinkedIn/Indeed Style)")
        print("=" * 60)
        
        for i, (cat, prob) in enumerate(zip(top_3_categories, top_3_probabilities), 1):
            # Calculate skill match
            match_pct, matched, missing = calculate_skill_match(resume_skills, cat)
            
            print(f"\n{i}. {cat}")
            print(f"   Confidence: {prob:.2%}")
            print(f"   Skill Match: {match_pct:.1f}%")
            
            if matched:
                print(f"   ✅ Matched Skills: {', '.join(matched[:5])}{'...' if len(matched) > 5 else ''}")
            if missing and i == 1:  # Show missing skills only for top recommendation
                print(f"   ⚠️  Skills to Learn: {', '.join(missing[:5])}{'...' if len(missing) > 5 else ''}")
        
        print("\n" + "=" * 60)
        print("💡 Recommendation: Focus on the top match with highest skill alignment")
        print("=" * 60)
    
    print("\n" + "=" * 60)
    print("Inference complete!")
    print("=" * 60)
