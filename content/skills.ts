import type { Skill } from "./schema";

export const skills: Skill[] = [
  // Languages
  { name: "Python", category: "Languages" },
  { name: "SQL", category: "Languages", experience: "sql" },
  { name: "R", category: "Languages", experience: "research-explorer" },
  { name: "C++", category: "Languages" },
  { name: "MATLAB", category: "Languages" },
  { name: "Bash", category: "Languages", experience: "terminal" },

  // AI & LLMs
  { name: "RAG", category: "AI & LLMs" },
  { name: "LangChain", category: "AI & LLMs" },
  { name: "OpenAI API", category: "AI & LLMs" },
  { name: "Embeddings (BGE-M3)", category: "AI & LLMs" },
  { name: "Qdrant", category: "AI & LLMs" },
  { name: "Prompt Engineering", category: "AI & LLMs" },

  // Backend & Web
  { name: "FastAPI", category: "Backend & Web" },
  { name: "REST APIs", category: "Backend & Web" },
  { name: "WebSocket", category: "Backend & Web" },

  // Databases & Cloud
  { name: "PostgreSQL", category: "Databases & Cloud", experience: "sql" },
  { name: "MongoDB", category: "Databases & Cloud" },
  { name: "Supabase", category: "Databases & Cloud", experience: "sql" },
  {
    name: "AWS (EC2, Auto Scaling, ALB, S3, CloudFront)",
    category: "Databases & Cloud",
    experience: "infra",
  },
  { name: "Docker", category: "Databases & Cloud", experience: "infra" },

  // Data Science & Visualisation
  { name: "Pandas", category: "Data Science & Visualisation" },
  { name: "NumPy", category: "Data Science & Visualisation" },
  {
    name: "scikit-learn",
    category: "Data Science & Visualisation",
    experience: "ml-lab",
  },
  {
    name: "LightGBM",
    category: "Data Science & Visualisation",
    experience: "ml-lab",
  },
  {
    name: "SHAP",
    category: "Data Science & Visualisation",
    experience: "ml-lab",
  },
  {
    name: "SPSS",
    category: "Data Science & Visualisation",
    experience: "research-explorer",
  },
  { name: "Excel", category: "Data Science & Visualisation" },
  { name: "Power BI", category: "Data Science & Visualisation" },
  { name: "Tableau", category: "Data Science & Visualisation" },

  // Tools & Research
  { name: "Git", category: "Tools & Research", experience: "terminal" },
  { name: "Linux", category: "Tools & Research", experience: "terminal" },
  {
    name: "CI/CD (GitHub Actions)",
    category: "Tools & Research",
    experience: "infra",
  },
  {
    name: "Survey Design",
    category: "Tools & Research",
    experience: "research-explorer",
  },
  {
    name: "VOSviewer",
    category: "Tools & Research",
    experience: "research-explorer",
  },
  {
    name: "ATLAS.ti",
    category: "Tools & Research",
    experience: "research-explorer",
  },
];
