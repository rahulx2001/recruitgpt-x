"""Seed the database with demo candidates and a sample job.

Run with: python -m app.data.seed
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.agents.job_understanding import parse_job_description
from app.config import get_settings
from app.models.db import create_all, get_session_maker
from app.models.schemas import (
    CandidateCreate,
    JobCreate,
    Project,
    SkillProficiency,
    WorkExperience,
)
from app.services.candidate_repo import (
    create_candidate,
    list_all_candidate_profiles,
)
from app.services.indexing import index_candidate, index_job
from app.services.job_repo import create_job, list_all_jobs

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("seed")


# ============================================================
# Candidate definitions
# ============================================================

CANDIDATES_DATA: List[Dict[str, Any]] = [
    {
        "full_name": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "headline": "Senior ML Engineer | Production ML | PyTorch, AWS",
        "location": "Bangalore, India",
        "current_role": "Senior ML Engineer",
        "years_experience": 6,
        "gender": "female",
        "school": "IIT Bombay",
        "linkedin_url": "https://linkedin.com/in/priya-sharma-ml",
        "github_url": "https://github.com/priyasharma",
        "portfolio_url": "https://priyasharma.dev",
        "resume_text": (
            "Senior ML Engineer with 6 years building production ML systems in FinTech. "
            "Led team of 4 engineers building real-time fraud detection models serving "
            "10M+ requests/day. Strong PyTorch, AWS, Airflow. Speaker at NeurIPS 2023."
        ),
        "skills": [
            ("Python", 5, 6.0),
            ("PyTorch", 5, 5.0),
            ("SQL", 5, 6.0),
            ("AWS", 4, 4.0),
            ("Docker", 4, 4.0),
            ("Airflow", 4, 3.0),
            ("Kubernetes", 3, 2.0),
            ("MLflow", 4, 3.0),
            ("Spark", 3, 3.0),
        ],
        "experiences": [
            (
                "FinTrust AI",
                "Senior ML Engineer",
                "2022-01",
                None,
                True,
                "Led team of 4 building real-time fraud detection. Reduced false positives by 35%.",
            ),
            (
                "DataCorp",
                "ML Engineer",
                "2019-06",
                "2021-12",
                False,
                "Built credit scoring models deployed to 2M users.",
            ),
            (
                "Analytics Co",
                "Data Scientist",
                "2018-01",
                "2019-05",
                False,
                "Customer churn prediction for SaaS clients.",
            ),
        ],
        "projects": [
            (
                "FraudShield",
                "Real-time fraud detection system",
                ["PyTorch", "AWS", "Kafka"],
                "10M req/day, 99.9% uptime",
            ),
            (
                "CreditAI",
                "Open-source credit scoring toolkit",
                ["Python", "scikit-learn"],
                "2k stars on GitHub",
            ),
        ],
        "github_stats": {
            "commits_per_month": 45,
            "public_repos": 18,
            "total_stars": 2300,
            "contributions_last_year": 540,
        },
        "certifications": [
            "AWS Solutions Architect",
            "TensorFlow Developer Certificate",
        ],
    },
    {
        "full_name": "Rahul Kumar",
        "email": "rahul.kumar@example.com",
        "headline": "ML Engineer | Startup Veteran | Fast Learner",
        "location": "San Francisco, USA",
        "current_role": "Lead ML Engineer",
        "years_experience": 5,
        "gender": "male",
        "school": "BITS Pilani",
        "linkedin_url": "https://linkedin.com/in/rahulkumar",
        "github_url": "https://github.com/rahulkumar",
        "portfolio_url": "https://rahul.engineering",
        "resume_text": (
            "Lead ML Engineer with rapid growth trajectory. Promoted twice in 3 years. "
            "Strong in PyTorch and production ML. Contributed to 3 open-source ML libraries."
        ),
        "skills": [
            ("Python", 5, 5.0),
            ("PyTorch", 5, 5.0),
            ("TensorFlow", 4, 3.0),
            ("SQL", 4, 5.0),
            ("AWS", 4, 4.0),
            ("GCP", 4, 3.0),
            ("FastAPI", 4, 3.0),
            ("Docker", 4, 4.0),
            ("React", 3, 2.0),
        ],
        "experiences": [
            (
                "Velocity AI",
                "Lead ML Engineer",
                "2023-03",
                None,
                True,
                "Promoted to Lead within 18 months. Built recommendation system from scratch.",
            ),
            (
                "Quantum Labs",
                "Senior ML Engineer",
                "2021-04",
                "2023-02",
                False,
                "NLP models for legal-tech. 2x promotion.",
            ),
            (
                "StartupX",
                "ML Engineer",
                "2019-08",
                "2021-03",
                False,
                "First ML hire. Built entire ML infra from zero.",
            ),
        ],
        "projects": [
            (
                "RecSysX",
                "Open-source recommendation library",
                ["PyTorch", "FastAPI"],
                "5k stars",
            ),
            ("ChatEval", "LLM evaluation toolkit", ["Python"], "1.2k stars"),
        ],
        "github_stats": {
            "commits_per_month": 80,
            "public_repos": 35,
            "total_stars": 8500,
            "contributions_last_year": 960,
        },
        "certifications": ["GCP Professional ML Engineer"],
    },
    {
        "full_name": "Amit Patel",
        "email": "amit.patel@example.com",
        "headline": "Data Engineer turned ML | SQL Expert",
        "location": "Pune, India",
        "current_role": "Senior Data Engineer",
        "years_experience": 7,
        "gender": "male",
        "school": "NIT Trichy",
        "linkedin_url": "https://linkedin.com/in/amitpatel",
        "github_url": "https://github.com/amitpatel",
        "portfolio_url": None,
        "resume_text": (
            "Senior Data Engineer with 7 years of experience. Deep SQL expertise. "
            "Recently transitioning into ML engineering. Strong in data pipelines."
        ),
        "skills": [
            ("SQL", 5, 7.0),
            ("Python", 4, 5.0),
            ("Spark", 5, 5.0),
            ("Airflow", 5, 5.0),
            ("Snowflake", 4, 3.0),
            ("DBT", 4, 3.0),
            ("AWS", 4, 5.0),
            ("PyTorch", 2, 1.0),
            ("TensorFlow", 2, 1.0),
        ],
        "experiences": [
            (
                "MegaCorp",
                "Senior Data Engineer",
                "2020-01",
                None,
                True,
                "Lead data platform engineer. Manages 50TB data lake.",
            ),
            (
                "FinData Inc",
                "Data Engineer",
                "2017-06",
                "2019-12",
                False,
                "Built ETL pipelines for financial reporting.",
            ),
            (
                "Analytics Co",
                "Junior Analyst",
                "2016-01",
                "2017-05",
                False,
                "Reporting and dashboard development.",
            ),
        ],
        "projects": [
            ("PipelineX", "Open-source Airflow DAG generator", ["Python"], "800 stars"),
        ],
        "github_stats": {
            "commits_per_month": 25,
            "public_repos": 8,
            "total_stars": 950,
            "contributions_last_year": 300,
        },
        "certifications": ["SnowPro Advanced", "DBT Analytics Engineer"],
    },
    {
        "full_name": "Sneha Reddy",
        "email": "sneha.reddy@example.com",
        "headline": "Staff ML Engineer | Distributed Systems | Leadership",
        "location": "Hyderabad, India",
        "current_role": "Staff ML Engineer",
        "years_experience": 9,
        "gender": "female",
        "school": "IIT Madras",
        "linkedin_url": "https://linkedin.com/in/snehareddy",
        "github_url": "https://github.com/snehareddy",
        "portfolio_url": "https://snehareddy.ai",
        "resume_text": (
            "Staff ML Engineer with 9 years building large-scale ML systems. "
            "Led platform team of 8. Published 5 papers. Deep expertise in distributed training."
        ),
        "skills": [
            ("Python", 5, 9.0),
            ("PyTorch", 5, 7.0),
            ("TensorFlow", 5, 5.0),
            ("SQL", 5, 9.0),
            ("AWS", 5, 6.0),
            ("Kubernetes", 5, 5.0),
            ("Spark", 5, 5.0),
            ("Ray", 4, 3.0),
            ("CUDA", 3, 2.0),
        ],
        "experiences": [
            (
                "TechGiant Inc",
                "Staff ML Engineer",
                "2021-04",
                None,
                True,
                "Lead platform team of 8. Own training infra for 100+ models.",
            ),
            (
                "InnovateLabs",
                "Senior ML Engineer",
                "2017-08",
                "2021-03",
                False,
                "Built recommendation platform serving 50M users.",
            ),
            (
                "DataStart",
                "ML Engineer",
                "2015-06",
                "2017-07",
                False,
                "First ML engineer. Built churn prediction.",
            ),
        ],
        "projects": [
            (
                "DistributedTrain",
                "Distributed PyTorch training lib",
                ["PyTorch", "CUDA"],
                "3.5k stars",
            ),
            (
                "MLPlatform",
                "Internal ML platform OSS port",
                ["Python", "K8s"],
                "1.8k stars",
            ),
        ],
        "github_stats": {
            "commits_per_month": 60,
            "public_repos": 22,
            "total_stars": 6800,
            "contributions_last_year": 720,
        },
        "certifications": ["Kubernetes Administrator", "AWS Solutions Architect Pro"],
    },
    {
        "full_name": "Vikram Singh",
        "email": "vikram.singh@example.com",
        "headline": "ML Engineer | Computer Vision | PhD",
        "location": "Delhi, India",
        "current_role": "Senior ML Engineer",
        "years_experience": 5,
        "gender": "male",
        "school": "IISc Bangalore",
        "linkedin_url": "https://linkedin.com/in/vikramsingh",
        "github_url": "https://github.com/vikramsingh",
        "portfolio_url": "https://vikram.cv",
        "resume_text": (
            "ML Engineer with PhD in Computer Vision. Published 12 papers. "
            "Strong research-to-production experience. Limited cloud / DevOps exposure."
        ),
        "skills": [
            ("Python", 5, 5.0),
            ("PyTorch", 5, 5.0),
            ("TensorFlow", 4, 3.0),
            ("Computer Vision", 5, 6.0),
            ("CUDA", 4, 3.0),
            ("SQL", 3, 3.0),
            ("AWS", 2, 1.0),
            ("Docker", 3, 2.0),
        ],
        "experiences": [
            (
                "VisionCo",
                "Senior ML Engineer",
                "2021-09",
                None,
                True,
                "Computer vision for autonomous systems.",
            ),
            (
                "Research Lab",
                "PhD Researcher",
                "2018-01",
                "2021-08",
                False,
                "Published 12 papers, 3 best paper awards.",
            ),
            ("Intern", "ML Intern", "2017-06", "2017-12", False, "Summer internship."),
        ],
        "projects": [
            ("VisionLib", "Open-source CV toolkit", ["PyTorch"], "4.2k stars"),
            (
                "3DRecon",
                "3D reconstruction from images",
                ["PyTorch", "CUDA"],
                "900 stars",
            ),
        ],
        "github_stats": {
            "commits_per_month": 35,
            "public_repos": 12,
            "total_stars": 5100,
            "contributions_last_year": 420,
        },
        "certifications": [],
    },
    {
        "full_name": "Ananya Iyer",
        "email": "ananya.iyer@example.com",
        "headline": "ML Engineer | LLM Specialist | Open Source Contributor",
        "location": "Mumbai, India",
        "current_role": "Senior ML Engineer",
        "years_experience": 4,
        "gender": "female",
        "school": "VJTI Mumbai",
        "linkedin_url": "https://linkedin.com/in/ananyaiyer",
        "github_url": "https://github.com/ananyaiyer",
        "portfolio_url": "https://ananya.engineering",
        "resume_text": (
            "ML Engineer specializing in LLMs and NLP. Core contributor to two major OSS "
            "ML libraries. Strong public speaking and writing presence."
        ),
        "skills": [
            ("Python", 5, 4.0),
            ("PyTorch", 5, 4.0),
            ("Transformers", 5, 3.0),
            ("LangChain", 5, 2.0),
            ("SQL", 4, 4.0),
            ("AWS", 3, 2.0),
            ("Docker", 4, 3.0),
            ("FastAPI", 4, 3.0),
        ],
        "experiences": [
            (
                "LLM Co",
                "Senior ML Engineer",
                "2022-08",
                None,
                True,
                "Core contributor to LangChain. Building LLM-powered products.",
            ),
            (
                "ChatBot Inc",
                "ML Engineer",
                "2020-07",
                "2022-07",
                False,
                "NLP and conversational AI.",
            ),
            (
                "University",
                "Research Assistant",
                "2019-01",
                "2020-06",
                False,
                "NLP research.",
            ),
        ],
        "projects": [
            ("PromptLib", "Prompt engineering library", ["Python"], "6.5k stars"),
            ("EvalSuite", "LLM evaluation framework", ["Python"], "2.1k stars"),
        ],
        "github_stats": {
            "commits_per_month": 95,
            "public_repos": 28,
            "total_stars": 12000,
            "contributions_last_year": 1140,
        },
        "certifications": ["DeepLearning.AI TensorFlow Developer"],
    },
    {
        "full_name": "Karthik Nair",
        "email": "karthik.nair@example.com",
        "headline": "Data Scientist | Junior Level | Recent Grad",
        "location": "Chennai, India",
        "current_role": "Data Scientist",
        "years_experience": 2,
        "gender": "male",
        "school": "Anna University",
        "linkedin_url": "https://linkedin.com/in/karthiknair",
        "github_url": "https://github.com/karthiknair",
        "portfolio_url": None,
        "resume_text": (
            "Junior Data Scientist with 2 years of experience. Strong in Python and statistics. "
            "Eager to grow into ML engineering."
        ),
        "skills": [
            ("Python", 4, 2.0),
            ("SQL", 4, 2.0),
            ("Pandas", 4, 2.0),
            ("scikit-learn", 3, 2.0),
            ("Tableau", 3, 1.0),
            ("Statistics", 4, 4.0),
        ],
        "experiences": [
            (
                "DataInsights",
                "Data Scientist",
                "2022-07",
                None,
                True,
                "Reporting and ad-hoc analysis.",
            ),
            (
                "University",
                "Research Intern",
                "2021-06",
                "2022-06",
                False,
                "Undergraduate research in statistical modeling.",
            ),
        ],
        "projects": [
            ("ChurnPredict", "Customer churn model", ["Python", "scikit-learn"], None),
        ],
        "github_stats": {
            "commits_per_month": 15,
            "public_repos": 5,
            "total_stars": 45,
            "contributions_last_year": 180,
        },
        "certifications": ["Google Data Analytics Certificate"],
    },
    {
        "full_name": "Meera Joshi",
        "email": "meera.joshi@example.com",
        "headline": "ML Engineer | MLOps | Production Systems",
        "location": "Pune, India",
        "current_role": "Senior ML Engineer",
        "years_experience": 6,
        "gender": "female",
        "school": "COEP Pune",
        "linkedin_url": "https://linkedin.com/in/meerajoshi",
        "github_url": "https://github.com/meerajoshi",
        "portfolio_url": "https://meera.codes",
        "resume_text": (
            "ML Engineer focused on MLOps and production systems. Built ML platforms "
            "serving 100+ models. Strong in Kubernetes, AWS, and observability."
        ),
        "skills": [
            ("Python", 5, 6.0),
            ("PyTorch", 4, 4.0),
            ("TensorFlow", 4, 4.0),
            ("SQL", 4, 5.0),
            ("AWS", 5, 5.0),
            ("Kubernetes", 5, 4.0),
            ("Terraform", 4, 3.0),
            ("MLflow", 5, 4.0),
            ("Docker", 5, 5.0),
        ],
        "experiences": [
            (
                "CloudML Inc",
                "Senior ML Engineer",
                "2021-09",
                None,
                True,
                "Built ML platform serving 100+ models in production.",
            ),
            (
                "FinTech Co",
                "ML Engineer",
                "2019-03",
                "2021-08",
                False,
                "Risk modeling and deployment.",
            ),
            (
                "DataCo",
                "Junior ML Engineer",
                "2018-01",
                "2019-02",
                False,
                "First ML role.",
            ),
        ],
        "projects": [
            ("MLOpsKit", "Open-source MLOps toolkit", ["Python", "K8s"], "4.5k stars"),
            ("ModelRegistry", "Model versioning system", ["Python"], "1.1k stars"),
        ],
        "github_stats": {
            "commits_per_month": 55,
            "public_repos": 19,
            "total_stars": 5800,
            "contributions_last_year": 660,
        },
        "certifications": ["CKA", "AWS Solutions Architect Pro", "Terraform Associate"],
    },
    {
        "full_name": "Arjun Mehta",
        "email": "arjun.mehta@example.com",
        "headline": "ML Researcher → Engineer | Domain Expert in NLP",
        "location": "Bangalore, India",
        "current_role": "ML Engineer",
        "years_experience": 4,
        "gender": "male",
        "school": "IIT Kanpur",
        "linkedin_url": "https://linkedin.com/in/arjunmehta",
        "github_url": "https://github.com/arjunmehta",
        "portfolio_url": None,
        "resume_text": (
            "ML Engineer with research background in NLP. 4 years transitioning from academia "
            "to industry. Strong publication record."
        ),
        "skills": [
            ("Python", 5, 4.0),
            ("PyTorch", 5, 4.0),
            ("Transformers", 5, 4.0),
            ("SQL", 3, 3.0),
            ("AWS", 3, 2.0),
            ("Docker", 3, 2.0),
            ("NLP", 5, 5.0),
        ],
        "experiences": [
            (
                "AI Research",
                "ML Engineer",
                "2021-08",
                None,
                True,
                "Applied NLP for legal and medical domains.",
            ),
            (
                "Research Lab",
                "Postdoc",
                "2020-02",
                "2021-07",
                False,
                "NLP research, 4 publications.",
            ),
            ("PhD", "PhD Researcher", "2015-08", "2020-01", False, "PhD in NLP."),
        ],
        "projects": [
            ("NLPToolkit", "Industry NLP toolkit", ["PyTorch"], "2.8k stars"),
        ],
        "github_stats": {
            "commits_per_month": 40,
            "public_repos": 14,
            "total_stars": 3200,
            "contributions_last_year": 480,
        },
        "certifications": [],
    },
    {
        "full_name": "Divya Krishnan",
        "email": "divya.krishnan@example.com",
        "headline": "Engineering Manager | ML & Data Teams",
        "location": "Bangalore, India",
        "current_role": "Engineering Manager",
        "years_experience": 10,
        "gender": "female",
        "school": "IIT Delhi",
        "linkedin_url": "https://linkedin.com/in/divyakrishnan",
        "github_url": "https://github.com/divyak",
        "portfolio_url": None,
        "resume_text": (
            "Engineering Manager with 10 years experience. Led ML and data teams of 10-15. "
            "Strong people leadership. Less hands-on coding recently."
        ),
        "skills": [
            ("Python", 4, 8.0),
            ("SQL", 4, 8.0),
            ("PyTorch", 3, 4.0),
            ("AWS", 4, 5.0),
            ("People Management", 5, 5.0),
            ("Strategy", 5, 5.0),
        ],
        "experiences": [
            (
                "TechCo",
                "Engineering Manager",
                "2020-04",
                None,
                True,
                "Manage team of 12 ML engineers.",
            ),
            (
                "InnovateLabs",
                "Senior ML Engineer → TL",
                "2016-01",
                "2020-03",
                False,
                "Tech lead, then manager.",
            ),
            ("Startup", "ML Engineer", "2014-06", "2015-12", False, "First ML hire."),
        ],
        "projects": [],
        "github_stats": {
            "commits_per_month": 5,
            "public_repos": 3,
            "total_stars": 80,
            "contributions_last_year": 60,
        },
        "certifications": ["EMEA Engineering Management Cert"],
    },
    {
        "full_name": "Rohan Desai",
        "email": "rohan.desai@example.com",
        "headline": "ML Engineer | Recommendation Systems",
        "location": "Mumbai, India",
        "current_role": "ML Engineer",
        "years_experience": 3,
        "gender": "male",
        "school": "Mumbai University",
        "linkedin_url": "https://linkedin.com/in/rohandesai",
        "github_url": "https://github.com/rohandesai",
        "portfolio_url": None,
        "resume_text": (
            "ML Engineer with 3 years experience. Specialized in recommendation systems. "
            "Strong collaborative skills."
        ),
        "skills": [
            ("Python", 4, 3.0),
            ("PyTorch", 4, 3.0),
            ("SQL", 4, 3.0),
            ("Spark", 3, 2.0),
            ("AWS", 3, 2.0),
            ("Docker", 3, 2.0),
        ],
        "experiences": [
            (
                "RecCo",
                "ML Engineer",
                "2021-09",
                None,
                True,
                "Recommendation systems for e-commerce.",
            ),
            (
                "StartupX",
                "Junior ML Engineer",
                "2020-07",
                "2021-08",
                False,
                "First ML role.",
            ),
        ],
        "projects": [
            ("RecSysLite", "Lightweight recsys library", ["PyTorch"], "450 stars"),
        ],
        "github_stats": {
            "commits_per_month": 30,
            "public_repos": 9,
            "total_stars": 600,
            "contributions_last_year": 360,
        },
        "certifications": [],
    },
    {
        "full_name": "Lakshmi Pillai",
        "email": "lakshmi.pillai@example.com",
        "headline": "Principal ML Engineer | Tech Leadership | 12 yrs",
        "location": "Bangalore, India",
        "current_role": "Principal ML Engineer",
        "years_experience": 12,
        "gender": "female",
        "school": "IISc Bangalore",
        "linkedin_url": "https://linkedin.com/in/lakshmipillai",
        "github_url": "https://github.com/lakshmip",
        "portfolio_url": "https://lakshmi.ai",
        "resume_text": (
            "Principal ML Engineer with 12 years of experience. Strategic tech leadership. "
            "Built ML platforms at scale. Published author."
        ),
        "skills": [
            ("Python", 5, 12.0),
            ("PyTorch", 5, 8.0),
            ("TensorFlow", 5, 8.0),
            ("SQL", 5, 12.0),
            ("AWS", 5, 8.0),
            ("Kubernetes", 5, 6.0),
            ("Spark", 5, 7.0),
            ("Strategy", 5, 5.0),
            ("People Management", 4, 4.0),
        ],
        "experiences": [
            (
                "TechGiant",
                "Principal ML Engineer",
                "2018-01",
                None,
                True,
                "Principal engineer. Lead platform initiatives.",
            ),
            (
                "InnovateLabs",
                "Staff ML Engineer",
                "2013-06",
                "2017-12",
                False,
                "Staff engineer, platform team lead.",
            ),
            (
                "Startup",
                "Founding Engineer",
                "2011-01",
                "2013-05",
                False,
                "Built ML platform from scratch.",
            ),
        ],
        "projects": [
            ("MLPlatformPro", "Enterprise ML platform", ["Python", "K8s"], "5k stars"),
        ],
        "github_stats": {
            "commits_per_month": 25,
            "public_repos": 15,
            "total_stars": 7200,
            "contributions_last_year": 300,
        },
        "certifications": ["AWS Solutions Architect Pro", "CKA"],
    },
]


SAMPLE_JOB = {
    "title": "Senior Machine Learning Engineer",
    "description": (
        "We are looking for a Senior Machine Learning Engineer to join our FinTech platform team. "
        "You will design, build, and deploy ML systems that power real-time fraud detection, "
        "credit risk modeling, and personalized financial recommendations.\n\n"
        "Responsibilities:\n"
        "- Build and maintain production ML pipelines (training, deployment, monitoring)\n"
        "- Collaborate with data engineering and product teams\n"
        "- Mentor junior engineers and contribute to architecture decisions\n"
        "- Push for fast iteration in a startup-paced environment\n\n"
        "Required:\n"
        "- 5+ years of experience with Python and PyTorch or TensorFlow\n"
        "- Strong SQL and data engineering fundamentals\n"
        "- Experience deploying ML models to production at scale\n"
        "- AWS or GCP cloud experience\n"
        "- Excellent communication skills\n\n"
        "Nice to have:\n"
        "- Experience in FinTech, fraud detection, or risk modeling\n"
        "- Open-source contributions\n"
        "- Startup or scale-up background\n"
        "- Leadership of small teams\n\n"
        "This is a fast-track-to-Staff role with significant growth opportunity."
    ),
}


# ============================================================
# Seed function
# ============================================================


async def seed_if_empty() -> bool:
    """Seed demo data only when the database has no jobs. Returns True if seeded."""
    await create_all()
    sm = get_session_maker()
    async with sm() as session:
        existing = await list_all_jobs(session)
        if existing:
            log.info("Database already has %d job(s) — skipping seed.", len(existing))
            return False
    await seed()
    return True


async def seed_demo_job_if_empty() -> bool:
    """Ensure the sample JD exists without touching candidates (post challenge import)."""
    settings = get_settings()
    owner_id = settings.default_dev_user_id
    await create_all()
    sm = get_session_maker()
    async with sm() as session:
        existing = await list_all_jobs(session)
        if existing:
            return False
        payload = JobCreate(
            title=SAMPLE_JOB["title"],
            description=SAMPLE_JOB["description"],
        )
        blueprint = await parse_job_description(payload.title, payload.description)
        job = await create_job(session, payload, blueprint, owner_id=owner_id)
        index_job(str(job.id), job.title, job.description, blueprint.model_dump())
        await session.commit()
        log.info("Seeded demo job: %s (id=%s)", job.title, job.id)
        return True


async def seed():
    settings = get_settings()
    owner_id = settings.default_dev_user_id
    await create_all()
    sm = get_session_maker()

    log.info("Seeding candidates for owner_id=%s...", owner_id)
    async with sm() as session:
        for data in CANDIDATES_DATA:
            payload = CandidateCreate(
                full_name=data["full_name"],
                email=data["email"],
                headline=data.get("headline"),
                location=data.get("location"),
                current_role=data.get("current_role"),
                years_experience=data.get("years_experience", 0),
                resume_text=data.get("resume_text", ""),
                linkedin_url=data.get("linkedin_url"),
                github_url=data.get("github_url"),
                portfolio_url=data.get("portfolio_url"),
                gender=data.get("gender"),
                ethnicity=data.get("ethnicity")
                or (
                    "South Asian"
                    if "India" in (data.get("location") or "")
                    else "Asian American"
                    if "USA" in (data.get("location") or "")
                    else "European"
                    if "UK" in (data.get("location") or "")
                    or "London" in (data.get("location") or "")
                    else "Other"
                ),
                school=data.get("school"),
                skills=[
                    SkillProficiency(name=name, proficiency=prof, years=yrs)
                    for (name, prof, yrs) in data["skills"]
                ],
                experiences=[
                    WorkExperience(
                        company=co,
                        role=role,
                        start_date=sd,
                        end_date=ed,
                        description=desc,
                        is_current=cur,
                    )
                    for (co, role, sd, ed, cur, desc) in data["experiences"]
                ],
                projects=[
                    Project(
                        name=p[0] if isinstance(p, (tuple, list)) else p["name"],
                        description=(
                            p[1]
                            if isinstance(p, (tuple, list))
                            else p.get("description", "")
                        ),
                        technologies=(
                            p[2]
                            if isinstance(p, (tuple, list))
                            else p.get("technologies", [])
                        ),
                        impact=(
                            p[3] if isinstance(p, (tuple, list)) else p.get("impact")
                        ),
                        url=(
                            p[4]
                            if isinstance(p, (tuple, list)) and len(p) > 4
                            else None
                        ),
                    )
                    for p in data.get("projects", [])
                ],
                github_stats=data.get("github_stats"),
                certifications=data.get("certifications", []),
            )
            try:
                profile = await create_candidate(session, payload, owner_id=owner_id)
                log.info("  + %s", profile.full_name)
            except Exception as e:
                log.warning("  ! Failed %s: %s", data["full_name"], e)
        await session.commit()

    # Index all candidates in vector store
    log.info("Indexing candidates in vector store...")
    async with sm() as session:
        profiles = await list_all_candidate_profiles(session)
        for p in profiles:
            try:
                index_candidate(p)
            except Exception as e:
                log.warning("  ! Indexing failed for %s: %s", p.full_name, e)

    # Seed the sample job
    log.info("Seeding sample job...")
    async with sm() as session:
        payload = JobCreate(
            title=SAMPLE_JOB["title"],
            description=SAMPLE_JOB["description"],
        )
        blueprint = await parse_job_description(payload.title, payload.description)
        job = await create_job(session, payload, blueprint, owner_id=owner_id)
        index_job(str(job.id), job.title, job.description, blueprint.model_dump())
        await session.commit()
        log.info("  + Job: %s (id=%s)", job.title, job.id)

    log.info("✅ Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
