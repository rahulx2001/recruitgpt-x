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

# Honeypot titles — keyword stuffers often keep unrelated roles
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

# Core skills from JD "absolutely need" section
CORE_AI_SKILLS = {
    "python",
    "embeddings",
    "embedding",
    "retrieval",
    "ranking",
    "ranking systems",
    "vector",
    "vector representations",
    "vector search",
    "semantic search",
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
    "bge",
    "e5",
    "hybrid search",
    "hybrid retrieval",
    "ndcg",
    "mrr",
    "map",
    "learning to rank",
    "information retrieval systems",
    "pytorch",
    "tensorflow",
}

SECONDARY_AI_SKILLS = {
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
    "information retrieval",
}

# Skills that appear in honeypot profiles (high endorsements, not real AI depth)
HONEYPOT_SKILL_NOISE = {
    "html",
    "tailwind",
    "photoshop",
    "css",
    "react",
    "javascript",
    "excel",
    "powerpoint",
    "word",
}

CONSULTING_FIRMS = {
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
}

# JD: Pune/Noida preferred; other Tier-1 India cities welcome
PREFERRED_LOCATIONS = {
    "pune",
    "noida",
}

INDIA_LOCATIONS = {
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
}

EXP_MIN = 4.0
EXP_IDEAL_LO = 5.0
EXP_IDEAL_HI = 9.0
EXP_MAX = 15.0

JOB_TITLE = "Senior AI Engineer — Founding Team"
JOB_COMPANY = "Redrob AI"

# JD text overlap — retrieval/ranking mandate (§3.4 reasoning + ranker signal)
JD_OVERLAP_PHRASES = (
    "embeddings",
    "retrieval",
    "ranking",
    "vector",
    "hybrid search",
    "hybrid retrieval",
    "ndcg",
    "mrr",
    "production",
    "deployed",
    "serving",
    "a/b",
    "evaluation",
    "fine-tuning",
    "lora",
    "sentence transformer",
    "faiss",
    "pinecone",
    "qdrant",
    "weaviate",
    "milvus",
    "opensearch",
    "elasticsearch",
    "learning to rank",
    "recommendation",
    "search",
    "recruiter",
    "matching",
)

# Product-company pedigree (JD: product over consulting/research)
PRODUCT_COMPANY_SIGNALS = {
    "google",
    "meta",
    "facebook",
    "apple",
    "netflix",
    "amazon",
    "microsoft",
    "uber",
    "flipkart",
    "phonepe",
    "swiggy",
    "zomato",
    "cred",
    "razorpay",
    "linkedin",
    "adobe",
    "salesforce",
    "krutrim",
    "sarvam",
    "rephrase",
    "glance",
    "unacademy",
    "zoho",
    "nykaa",
}

# Framework-chaser noise (JD explicitly discourages LangChain-only profiles)
FRAMEWORK_NOISE = {
    "langchain",
    "llamaindex",
    "autogen",
    "crewai",
}