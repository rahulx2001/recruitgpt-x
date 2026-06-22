"""Parsed requirements from job_description.docx — Senior AI Engineer @ Redrob."""

from __future__ import annotations

# Titles strongly aligned with the JD (retrieval / ranking / ML systems)
STRONG_TITLES = (
    "senior ai engineer",
    "ai engineer",
    "machine learning engineer",
    "ml engineer",
    "senior machine learning engineer",
    "staff ml engineer",
    "applied scientist",
    "research engineer",
)

GOOD_TITLES = (
    "data scientist",
    "ml scientist",
    "nlp engineer",
    "search engineer",
    "recommendation engineer",
    "software engineer",
    "backend engineer",
)

WEAK_TITLES = (
    "hr manager",
    "accountant",
    "sales executive",
    "marketing manager",
    "graphic designer",
    "content writer",
    "customer support",
    "civil engineer",
    "mechanical engineer",
    "operations manager",
    "project manager",
    "business analyst",
    "qa engineer",
)

# Word-boundary skill phrases (no bare "map", "e5", "bge", "search")
CORE_SKILL_PHRASES = (
    "python",
    "embeddings",
    "embedding",
    "information retrieval",
    "retrieval",
    "ranking systems",
    "learning to rank",
    "vector search",
    "vector database",
    "vector representations",
    "semantic search",
    "hybrid search",
    "hybrid retrieval",
    "faiss",
    "qdrant",
    "pinecone",
    "weaviate",
    "milvus",
    "opensearch",
    "elasticsearch",
    "pgvector",
    "sentence transformers",
    "sentence transformer",
    "ndcg",
    "mrr",
    "pytorch",
    "tensorflow",
)

SECONDARY_SKILL_PHRASES = (
    "nlp",
    "llm",
    "fine-tuning",
    "fine tuning",
    "lora",
    "qlora",
    "mlops",
    "mlflow",
    "hugging face",
    "transformers",
    "deep learning",
    "machine learning",
    "recommendation",
    "recommendation systems",
)

HONEYPOT_SKILL_NOISE = (
    "html",
    "tailwind",
    "photoshop",
    "css",
    "react",
    "javascript",
    "excel",
    "powerpoint",
    "word",
)

# JD disqualifier domains without NLP/IR depth
CV_SPEECH_ROBOTICS = (
    "computer vision",
    "object detection",
    "speech recognition",
    "asr",
    "robotics",
    "autonomous driving",
)

CONSULTING_FIRMS = (
    "tcs",
    "tata consultancy",
    "infosys",
    "wipro",
    "accenture",
    "cognizant",
    "capgemini",
    "mindtree",
    "ltimindtree",
    "hcl",
    "tech mahindra",
    "deloitte consulting",
    "ibm consulting",
)

PREFERRED_LOCATIONS = ("pune", "noida")

INDIA_LOCATIONS = (
    "pune",
    "noida",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "mumbai",
    "delhi",
    "gurgaon",
    "gurugram",
    "chennai",
    "india",
)

EXP_MIN = 4.0
EXP_IDEAL_LO = 5.0
EXP_IDEAL_HI = 9.0
EXP_MAX = 15.0

JOB_TITLE = "Senior AI Engineer — Founding Team"
JOB_COMPANY = "Redrob AI"

# JD excerpt for TF-IDF semantic layer (offline, no API)
JD_DOCUMENT = """
senior ai engineer founding team embeddings retrieval ranking hybrid search vector database
production deployed users evaluation ndcg mrr map learning to rank recommendation systems
sentence transformers faiss pinecone qdrant weaviate milvus opensearch elasticsearch python
fine-tuning lora shipper product company recruiter matching marketplace hiring
"""

# Weighted phrases for career-description matching (Tier-5 plain language)
CAREER_JD_WEIGHTS = {
    "recommendation system": 0.22,
    "recommendation systems": 0.22,
    "ranking system": 0.20,
    "search system": 0.18,
    "vector search": 0.18,
    "hybrid search": 0.16,
    "hybrid retrieval": 0.16,
    "embedding": 0.14,
    "retrieval": 0.14,
    "ndcg": 0.12,
    "learning to rank": 0.12,
    "deployed to": 0.10,
    "production": 0.08,
    "a/b test": 0.08,
    "recruiter": 0.06,
}

JD_OVERLAP_PHRASES = tuple(CAREER_JD_WEIGHTS.keys()) + (
    "embeddings",
    "ranking",
    "vector",
    "serving",
    "pipeline",
    "matching",
)

# Indian product startups — JD wants shipper mindset, not FAANG ladder
STARTUP_BOOST_SIGNALS = {
    "zomato",
    "phonepe",
    "swiggy",
    "flipkart",
    "cred",
    "razorpay",
    "krutrim",
    "sarvam",
    "rephrase",
    "unacademy",
    "nykaa",
    "zoho",
    "aganitha",
    "niramai",
    "verloop",
}

# FAANG/big-tech at *current* role — JD yellow flag, not green
FAANG_CURRENT_PENALTY = {
    "google",
    "meta",
    "facebook",
    "apple",
    "microsoft",
    "amazon",
    "netflix",
}

FRAMEWORK_NOISE = (
    "langchain",
    "llamaindex",
    "autogen",
    "crewai",
)

RESEARCH_ONLY_TITLES = (
    "research scientist",
    "principal scientist",
    "applied scientist",
    "research engineer",
)

PRODUCTION_SIGNAL_PHRASES = (
    "production",
    "deployed",
    "serving",
    "shipped",
    "users",
    "a/b",
    "ndcg",
    "mrr",
    "retrieval",
    "embedding",
    "vector",
    "ranking",
    "pipeline",
    "scale",
    "online",
    "offline",
)