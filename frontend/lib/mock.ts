// Realistic seed data for the RecruitGPT X product surfaces.
// Hand-authored to read like a recruiting team's live workspace.

export type Recommendation = "Strong Hire" | "Hire" | "Lean Hire" | "Hold";
export type PipelineStage =
  | "Applied"
  | "Screened"
  | "Interview"
  | "Offer"
  | "Hired";
export type Trajectory = "High" | "Steady" | "Emerging";

export interface Candidate {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  gender?: "male" | "female" | null;
  avatarColor: string;
  matchScore: number;
  skillsMatch: number;
  experienceMatch: number;
  githubMatch: number;
  experienceYears: number;
  githubScore: number;
  skills: string[];
  recommendation: Recommendation;
  trajectory: Trajectory;
  stage: PipelineStage;
  job: string;
  appliedDaysAgo: number;
  reasons: string[];
  concern?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  candidates: number;
  newThisWeek: number;
  stages: { applied: number; screened: number; interview: number; offer: number };
  status: "Open" | "Interviewing" | "Offer stage";
  owner: string;
  ownerColor: string;
  openedDaysAgo: number;
}

const AV = {
  indigo: "#4F46E5",
  slate: "#475569",
  teal: "#0E9F6E",
  amber: "#C2780C",
  rose: "#D1453B",
  violet: "#7C3AED",
  blue: "#2563EB",
  cyan: "#0891B2",
  pink: "#DB2777",
  stone: "#57534E",
};

export const candidates: Candidate[] = [
  {
    id: "c_sarah_chen",
    name: "Sarah Chen",
    title: "Senior Machine Learning Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    avatarColor: AV.indigo,
    matchScore: 96,
    skillsMatch: 98,
    experienceMatch: 95,
    githubMatch: 93,
    experienceYears: 7,
    githubScore: 94,
    skills: ["Python", "PyTorch", "AWS", "Docker", "Kubernetes", "Ray"],
    recommendation: "Strong Hire",
    trajectory: "High",
    stage: "Interview",
    job: "Senior ML Engineer",
    appliedDaysAgo: 3,
    reasons: [
      "Built production ML ranking systems serving 40M+ users",
      "Led a 6-engineer platform team through 0→1 launch",
      "AWS certified; deep MLOps and inference-optimization background",
    ],
  },
  {
    id: "c_rahul_singh",
    name: "Rahul Singh",
    title: "ML Engineer",
    company: "Razorpay",
    location: "Bengaluru, IN",
    avatarColor: AV.teal,
    matchScore: 91,
    skillsMatch: 92,
    experienceMatch: 90,
    githubMatch: 88,
    experienceYears: 6,
    githubScore: 86,
    skills: ["Python", "TensorFlow", "Spark", "Airflow", "GCP"],
    recommendation: "Strong Hire",
    trajectory: "High",
    stage: "Interview",
    job: "Senior ML Engineer",
    appliedDaysAgo: 4,
    reasons: [
      "Shipped a fraud-detection model cutting chargebacks 23%",
      "Strong data-pipeline ownership across the full lifecycle",
      "Consistent open-source contributions in the ML tooling space",
    ],
    concern: "Limited people-management experience for a lead track",
  },
  {
    id: "c_alex_kim",
    name: "Alex Kim",
    title: "Applied Scientist",
    company: "Netflix",
    location: "Los Gatos, CA",
    avatarColor: AV.violet,
    matchScore: 88,
    skillsMatch: 90,
    experienceMatch: 86,
    githubMatch: 82,
    experienceYears: 8,
    githubScore: 79,
    skills: ["Python", "PyTorch", "Recommenders", "Spark", "SQL"],
    recommendation: "Hire",
    trajectory: "Steady",
    stage: "Screened",
    job: "Senior ML Engineer",
    appliedDaysAgo: 5,
    reasons: [
      "Owned recommendation ranking experiments end-to-end",
      "Strong offline→online evaluation and A/B test rigor",
    ],
    concern: "More research-leaning than shipping-leaning",
  },
  {
    id: "c_maya_iyer",
    name: "Maya Iyer",
    title: "Senior Data Scientist",
    company: "Swiggy",
    location: "Bengaluru, IN",
    avatarColor: AV.amber,
    matchScore: 85,
    skillsMatch: 84,
    experienceMatch: 88,
    githubMatch: 80,
    experienceYears: 6,
    githubScore: 72,
    skills: ["Python", "SQL", "XGBoost", "dbt", "Looker"],
    recommendation: "Hire",
    trajectory: "High",
    stage: "Interview",
    job: "Data Scientist",
    appliedDaysAgo: 2,
    reasons: [
      "Built demand-forecasting models across 12 cities",
      "Translates ambiguous business problems into shippable models",
    ],
  },
  {
    id: "c_daniel_okafor",
    name: "Daniel Okafor",
    title: "Backend Engineer",
    company: "PhonePe",
    location: "Pune, IN",
    avatarColor: AV.blue,
    matchScore: 83,
    skillsMatch: 86,
    experienceMatch: 81,
    githubMatch: 84,
    experienceYears: 5,
    githubScore: 81,
    skills: ["Go", "Python", "Postgres", "Kafka", "Kubernetes"],
    recommendation: "Hire",
    trajectory: "Steady",
    stage: "Offer",
    job: "Backend Engineer",
    appliedDaysAgo: 9,
    reasons: [
      "Scaled payment services to 8M concurrent sessions",
      "Strong distributed-systems and reliability instincts",
    ],
  },
  {
    id: "c_priya_nair",
    name: "Priya Nair",
    title: "Product Analyst",
    company: "CRED",
    location: "Bengaluru, IN",
    avatarColor: AV.pink,
    matchScore: 81,
    skillsMatch: 83,
    experienceMatch: 79,
    githubMatch: 60,
    experienceYears: 4,
    githubScore: 41,
    skills: ["SQL", "Power BI", "Python", "Amplitude", "Statistics"],
    recommendation: "Lean Hire",
    trajectory: "Emerging",
    stage: "Screened",
    job: "Product Analyst",
    appliedDaysAgo: 6,
    reasons: [
      "Owned the activation funnel analytics for a 3M-user app",
      "Strong SQL + BI craft; clear written analysis",
    ],
    concern: "Early in career for a senior analytics mandate",
  },
  {
    id: "c_tom_alvarez",
    name: "Tom Alvarez",
    title: "Staff Software Engineer",
    company: "Datadog",
    location: "New York, NY",
    avatarColor: AV.slate,
    matchScore: 79,
    skillsMatch: 80,
    experienceMatch: 84,
    githubMatch: 76,
    experienceYears: 10,
    githubScore: 74,
    skills: ["Python", "Go", "Kubernetes", "Terraform", "AWS"],
    recommendation: "Lean Hire",
    trajectory: "Steady",
    stage: "Applied",
    job: "Backend Engineer",
    appliedDaysAgo: 1,
    reasons: ["Deep platform and observability background"],
    concern: "Senior-heavy for an IC role; comp expectations unclear",
  },
  {
    id: "c_lena_fischer",
    name: "Lena Fischer",
    title: "Machine Learning Engineer",
    company: "Wayfair",
    location: "Berlin, DE",
    avatarColor: AV.cyan,
    matchScore: 77,
    skillsMatch: 79,
    experienceMatch: 76,
    githubMatch: 78,
    experienceYears: 5,
    githubScore: 77,
    skills: ["Python", "PyTorch", "Search", "Elasticsearch", "Docker"],
    recommendation: "Lean Hire",
    trajectory: "Emerging",
    stage: "Applied",
    job: "Senior ML Engineer",
    appliedDaysAgo: 7,
    reasons: ["Hands-on search relevance and retrieval work"],
    concern: "Relocation and visa timeline to confirm",
  },
  {
    id: "c_arjun_mehta",
    name: "Arjun Mehta",
    title: "Data Scientist",
    company: "Flipkart",
    location: "Bengaluru, IN",
    avatarColor: AV.stone,
    matchScore: 74,
    skillsMatch: 76,
    experienceMatch: 73,
    githubMatch: 68,
    experienceYears: 4,
    githubScore: 63,
    skills: ["Python", "SQL", "Pandas", "scikit-learn", "Tableau"],
    recommendation: "Hold",
    trajectory: "Emerging",
    stage: "Applied",
    job: "Data Scientist",
    appliedDaysAgo: 8,
    reasons: ["Solid fundamentals; growing production exposure"],
    concern: "Limited large-scale deployment experience",
  },
];

export const jobs: Job[] = [
  {
    id: "j_sr_ml",
    title: "Senior ML Engineer",
    department: "Engineering",
    location: "Pune / Remote",
    type: "Full-time",
    candidates: 45,
    newThisWeek: 8,
    stages: { applied: 45, screened: 22, interview: 7, offer: 2 },
    status: "Interviewing",
    owner: "Jordan Lee",
    ownerColor: AV.indigo,
    openedDaysAgo: 18,
  },
  {
    id: "j_product_analyst",
    title: "Product Analyst",
    department: "Data",
    location: "Bengaluru",
    type: "Full-time",
    candidates: 62,
    newThisWeek: 11,
    stages: { applied: 62, screened: 28, interview: 6, offer: 1 },
    status: "Open",
    owner: "Priya Raman",
    ownerColor: AV.teal,
    openedDaysAgo: 9,
  },
  {
    id: "j_data_scientist",
    title: "Data Scientist",
    department: "Data",
    location: "Remote (India)",
    type: "Full-time",
    candidates: 51,
    newThisWeek: 6,
    stages: { applied: 51, screened: 24, interview: 8, offer: 2 },
    status: "Interviewing",
    owner: "Jordan Lee",
    ownerColor: AV.indigo,
    openedDaysAgo: 22,
  },
  {
    id: "j_business_analyst",
    title: "Business Analyst",
    department: "Operations",
    location: "Noida",
    type: "Full-time",
    candidates: 38,
    newThisWeek: 4,
    stages: { applied: 38, screened: 15, interview: 4, offer: 0 },
    status: "Open",
    owner: "Sam Devi",
    ownerColor: AV.amber,
    openedDaysAgo: 5,
  },
  {
    id: "j_backend",
    title: "Backend Engineer",
    department: "Engineering",
    location: "Pune / Hybrid",
    type: "Full-time",
    candidates: 74,
    newThisWeek: 13,
    stages: { applied: 74, screened: 35, interview: 9, offer: 3 },
    status: "Offer stage",
    owner: "Alex Romero",
    ownerColor: AV.blue,
    openedDaysAgo: 27,
  },
];

export const funnel = [
  { stage: "Applied", count: 1248, color: "#5d2a1a" },
  { stage: "Screened", count: 620, color: "#6b3826" },
  { stage: "Interview", count: 180, color: "#7d4832" },
  { stage: "Offer", count: 47, color: "#915640" },
  { stage: "Hired", count: 31, color: "#a6654e" },
];

export interface Activity {
  id: string;
  actor: string;
  actorColor: string;
  action: string;
  target: string;
  context: string;
  time: string;
}

export const activity: Activity[] = [
  {
    id: "a1",
    actor: "Jordan Lee",
    actorColor: AV.indigo,
    action: "moved",
    target: "Sarah Chen",
    context: "to Interview · Senior ML Engineer",
    time: "12m ago",
  },
  {
    id: "a2",
    actor: "Priya Raman",
    actorColor: AV.teal,
    action: "shortlisted",
    target: "Maya Iyer",
    context: "Data Scientist",
    time: "48m ago",
  },
  {
    id: "a3",
    actor: "Alex Romero",
    actorColor: AV.blue,
    action: "sent an offer to",
    target: "Daniel Okafor",
    context: "Backend Engineer · ₹68L",
    time: "2h ago",
  },
  {
    id: "a4",
    actor: "Sam Devi",
    actorColor: AV.amber,
    action: "left a scorecard for",
    target: "Rahul Singh",
    context: "Technical screen · Strong Hire",
    time: "3h ago",
  },
  {
    id: "a5",
    actor: "Jordan Lee",
    actorColor: AV.indigo,
    action: "scheduled an interview with",
    target: "Alex Kim",
    context: "System design · Thu 2:00 PM",
    time: "5h ago",
  },
  {
    id: "a6",
    actor: "RecruitGPT",
    actorColor: AV.violet,
    action: "ranked",
    target: "38 new candidates",
    context: "Product Analyst",
    time: "6h ago",
  },
];

export interface Interview {
  id: string;
  candidate: string;
  candidateColor: string;
  role: string;
  round: string;
  interviewer: string;
  when: string;
  status: "Scheduled" | "Awaiting feedback" | "Completed";
}

export const interviews: Interview[] = [
  {
    id: "i1",
    candidate: "Sarah Chen",
    candidateColor: AV.indigo,
    role: "Senior ML Engineer",
    round: "System design",
    interviewer: "Jordan Lee",
    when: "Today · 2:00 PM",
    status: "Scheduled",
  },
  {
    id: "i2",
    candidate: "Maya Iyer",
    candidateColor: AV.amber,
    role: "Data Scientist",
    round: "Case study",
    interviewer: "Priya Raman",
    when: "Today · 4:30 PM",
    status: "Scheduled",
  },
  {
    id: "i3",
    candidate: "Rahul Singh",
    candidateColor: AV.teal,
    role: "Senior ML Engineer",
    round: "Technical screen",
    interviewer: "Sam Devi",
    when: "Yesterday",
    status: "Awaiting feedback",
  },
  {
    id: "i4",
    candidate: "Daniel Okafor",
    candidateColor: AV.blue,
    role: "Backend Engineer",
    round: "Final loop",
    interviewer: "Alex Romero",
    when: "Mon · 11:00 AM",
    status: "Completed",
  },
];

// Analytics series
export const timeToHire = [
  { month: "Jan", days: 41 },
  { month: "Feb", days: 38 },
  { month: "Mar", days: 36 },
  { month: "Apr", days: 33 },
  { month: "May", days: 29 },
  { month: "Jun", days: 26 },
];

export const sourceQuality = [
  { source: "RecruitGPT Search", quality: 92, hires: 14 },
  { source: "Referrals", quality: 84, hires: 9 },
  { source: "Inbound", quality: 61, hires: 5 },
  { source: "Job boards", quality: 48, hires: 3 },
];

export const offerAcceptance = [
  { month: "Jan", rate: 58 },
  { month: "Feb", rate: 62 },
  { month: "Mar", rate: 64 },
  { month: "Apr", rate: 67 },
  { month: "May", rate: 71 },
  { month: "Jun", rate: 73 },
];

export const candidateQuality = [
  { month: "Jan", score: 71 },
  { month: "Feb", score: 73 },
  { month: "Mar", score: 74 },
  { month: "Apr", score: 78 },
  { month: "May", score: 81 },
  { month: "Jun", score: 84 },
];

export const conversionFunnel = funnel.map((f) => ({
  stage: f.stage,
  count: f.count,
}));

// Search
export const suggestedSearches = [
  "ML engineers with production deployment experience",
  "Backend engineers with startup experience",
  "Candidates with strong SQL and Power BI but limited leadership experience",
  "Data scientists who shipped recommendation systems at product companies",
];

export const recentSearches = [
  "Senior ML engineers in Pune or remote",
  "Product analysts with activation-funnel ownership",
  "Engineers who've scaled payments infrastructure",
];

export const savedSearches = [
  { name: "Founding ML — India", count: 31, owner: "Jordan Lee" },
  { name: "Senior analysts, BI-heavy", count: 22, owner: "Priya Raman" },
  { name: "Backend, distributed systems", count: 47, owner: "Alex Romero" },
];

// AI Recruiter conversation
export interface ChatCitation {
  candidate: string;
  detail: string;
}
export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
}

export const chatThread: ChatTurn[] = [
  {
    role: "user",
    text: "Who is the strongest ML candidate for the Senior ML Engineer role?",
  },
  {
    role: "assistant",
    text: "Sarah Chen is the strongest fit at a 96% match. She's shipped production ML ranking systems to 40M+ users and led a 6-engineer platform team — which maps directly to the role's 0→1 ownership mandate. Rahul Singh (91%) is a close second with stronger data-pipeline depth but less management exposure.",
    citations: [
      { candidate: "Sarah Chen", detail: "96% match · Strong Hire · 7y" },
      { candidate: "Rahul Singh", detail: "91% match · Strong Hire · 6y" },
    ],
  },
  {
    role: "user",
    text: "Why is Sarah ranked above Rahul?",
  },
  {
    role: "assistant",
    text: "Three differentiators: (1) Sarah's production scale is larger and ranking-specific, which the JD emphasizes; (2) she has demonstrated team leadership, while Rahul's experience is primarily IC; (3) her skills match is 98% vs 92%, driven by overlapping MLOps and inference-optimization tooling. Rahul edges her on open-source activity, but the role weights shipped production systems more heavily.",
    citations: [
      { candidate: "Sarah Chen", detail: "Skills 98% · Experience 95%" },
      { candidate: "Rahul Singh", detail: "Skills 92% · Experience 90%" },
    ],
  },
];

export const suggestedQuestions = [
  "Which candidates have leadership experience?",
  "Compare Sarah Chen and Alex Kim",
  "Who is closest to an offer this week?",
  "Surface hidden gems below rank 20",
];

export const teamMembers = [
  { name: "Jordan Lee", role: "Head of Talent", color: AV.indigo },
  { name: "Priya Raman", role: "Recruiter", color: AV.teal },
  { name: "Alex Romero", role: "Eng Recruiter", color: AV.blue },
  { name: "Sam Devi", role: "Sourcer", color: AV.amber },
];

export const stat = {
  candidatesRanked: "50,000+",
  recruiters: "500+",
  screeningReduction: "89%",
  offerAcceptance: "73%",
};
