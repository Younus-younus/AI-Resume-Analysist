"""
Quick test script to verify models are working properly
"""
import os
import joblib
import re
import nltk
from nltk.corpus import stopwords

# File paths
MODEL_FILE = "logistic_model.pkl"
VECTORIZER_FILE = "tfidf_vectorizer.pkl"
ENCODER_FILE = "label_encoder.pkl"

def download_nltk_data():
    """Download required NLTK data"""
    try:
        stopwords.words('english')
        print("✓ NLTK stopwords already downloaded")
    except LookupError:
        print("Downloading NLTK stopwords...")
        nltk.download('stopwords')
        print("✓ NLTK stopwords downloaded")

def clean_text(text, stop_words):
    """Clean and preprocess resume text"""
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z ]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    words = [w for w in text.split() if w not in stop_words]
    return " ".join(words)

def test_models():
    """Test if models can make predictions"""
    print("\n" + "=" * 60)
    print("Testing Resume Screening AI Models")
    print("=" * 60)
    
    # Check if files exist
    print("\n1. Checking if model files exist...")
    if not os.path.exists(MODEL_FILE):
        print(f"❌ {MODEL_FILE} not found!")
        print("   Run 'python main.py' to train the model first.")
        return False
    print(f"   ✓ {MODEL_FILE}")
    
    if not os.path.exists(VECTORIZER_FILE):
        print(f"❌ {VECTORIZER_FILE} not found!")
        return False
    print(f"   ✓ {VECTORIZER_FILE}")
    
    if not os.path.exists(ENCODER_FILE):
        print(f"❌ {ENCODER_FILE} not found!")
        return False
    print(f"   ✓ {ENCODER_FILE}")
    
    # Download NLTK data
    print("\n2. Checking NLTK data...")
    download_nltk_data()
    stop_words = set(stopwords.words('english'))
    
    # Load models
    print("\n3. Loading models...")
    try:
        model = joblib.load(MODEL_FILE)
        print(f"   ✓ Model loaded: {type(model).__name__}")
        
        vectorizer = joblib.load(VECTORIZER_FILE)
        print(f"   ✓ Vectorizer loaded: {type(vectorizer).__name__}")
        print(f"     - Vocabulary size: {len(vectorizer.vocabulary_)}")
        
        encoder = joblib.load(ENCODER_FILE)
        print(f"   ✓ Label encoder loaded")
        print(f"     - Number of categories: {len(encoder.classes_)}")
        print(f"     - Sample categories: {list(encoder.classes_)[:5]}")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False
    
    # Test prediction
    print("\n4. Testing prediction...")
    test_resume = """
    Experienced software developer with 5 years of Python programming.
    Strong background in machine learning and data science. Proficient in
    scikit-learn, TensorFlow, and pandas. Built multiple ML models for 
    production environments. Experience with SQL and data analysis.
    """
    
    try:
        # Clean text
        cleaned = clean_text(test_resume, stop_words)
        print(f"   ✓ Text cleaned ({len(cleaned.split())} words)")
        
        # Transform
        features = vectorizer.transform([cleaned])
        print(f"   ✓ Text vectorized (shape: {features.shape})")
        
        # Predict
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]
        predicted_category = encoder.inverse_transform([prediction])[0]
        confidence = probabilities[prediction]
        
        print(f"   ✓ Prediction made successfully!")
        print(f"\n   Result: {predicted_category}")
        print(f"   Confidence: {confidence:.2%}")
        
    except Exception as e:
        print(f"❌ Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("✅ All tests passed! Models are working correctly.")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_models()
    if success:
        print("\n✅ You can now run the web app with: python app.py")
    else:
        print("\n❌ Please fix the errors before running the web app.")
