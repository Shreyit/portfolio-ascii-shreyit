import type { Skill } from "./schema";

// Transcribed from the resume's Technical Skills section, in its order.
// `experience` links a skill to the lab that demonstrates it.
export const skills: Skill[] = [
  { name: "Python", category: "Programming Languages" },
  { name: "SQL", category: "Programming Languages", experience: "sql" },
  {
    name: "R",
    category: "Programming Languages",
    experience: "research-explorer",
  },
  { name: "C++", category: "Programming Languages" },
  { name: "MATLAB", category: "Programming Languages" },
  { name: "Bash", category: "Programming Languages", experience: "terminal" },
  { name: "RAG", category: "AI & LLM Engineering" },
  { name: "LangChain", category: "AI & LLM Engineering" },
  { name: "OpenAI API", category: "AI & LLM Engineering" },
  { name: "Embeddings (BGE-M3)", category: "AI & LLM Engineering" },
  { name: "Qdrant", category: "AI & LLM Engineering" },
  { name: "Prompt Engineering", category: "AI & LLM Engineering" },
  { name: "Pandas", category: "Data Science & Machine Learning" },
  { name: "NumPy", category: "Data Science & Machine Learning" },
  {
    name: "scikit-learn",
    category: "Data Science & Machine Learning",
    experience: "ml-lab",
  },
  {
    name: "LightGBM",
    category: "Data Science & Machine Learning",
    experience: "ml-lab",
  },
  {
    name: "SHAP",
    category: "Data Science & Machine Learning",
    experience: "ml-lab",
  },
  {
    name: "PostgreSQL",
    category: "Databases & Data Engineering",
    experience: "sql",
  },
  { name: "MongoDB", category: "Databases & Data Engineering" },
  {
    name: "Supabase",
    category: "Databases & Data Engineering",
    experience: "sql",
  },
  { name: "DuckDB", category: "Databases & Data Engineering" },
  {
    name: "AWS (EC2, Auto Scaling, ALB, S3, CloudFront)",
    category: "Cloud & DevOps",
    experience: "infra",
  },
  { name: "Docker", category: "Cloud & DevOps", experience: "infra" },
  { name: "Git", category: "Cloud & DevOps", experience: "terminal" },
  { name: "Linux", category: "Cloud & DevOps", experience: "terminal" },
  {
    name: "CI/CD (GitHub Actions)",
    category: "Cloud & DevOps",
    experience: "infra",
  },
  {
    name: "SPSS",
    category: "Analytics & Research Tools",
    experience: "research-explorer",
  },
  { name: "Excel", category: "Analytics & Research Tools" },
  { name: "Power BI", category: "Analytics & Research Tools" },
  { name: "Tableau", category: "Analytics & Research Tools" },
  {
    name: "Survey Design",
    category: "Analytics & Research Tools",
    experience: "research-explorer",
  },
  {
    name: "VOSviewer",
    category: "Analytics & Research Tools",
    experience: "research-explorer",
  },
  {
    name: "ATLAS.ti",
    category: "Analytics & Research Tools",
    experience: "research-explorer",
  },
  { name: "FastAPI", category: "Backend Development", experience: "infra" },
  { name: "REST APIs", category: "Backend Development" },
];
