# 🛡️ Sentinel // SOC.AI

> AI-powered SOC Analyst Copilot for Cyber Defense

Sentinel is an AI-powered Security Operations Center (SOC) copilot that helps security analysts detect threats, investigate incidents, perform MITRE ATT&CK mapping, and generate investigation reports using Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG).

![Sentinel Banner](docs/banner.png)

---

## 🚀 Features

### 🤖 AI SOC Assistant
- AI-powered cybersecurity copilot
- Natural language threat hunting
- Incident investigation
- Security Q&A

### 🎯 MITRE ATT&CK Integration
- ATT&CK technique mapping
- Threat correlation
- TTP identification

### 📚 RAG Knowledge Base
- Upload security documents
- Search internal knowledge
- Threat intelligence retrieval
- Context-aware AI responses

### 💬 Interactive Investigation Console
- Multi-turn conversations
- AI reasoning
- Tool calling
- Investigation history

### 📄 AI Report Generation
- Incident reports
- Threat summaries
- Executive reports
- PDF export

### 🔐 Authentication
- Secure user login
- User accounts
- Session management

---

# 🖥️ Dashboard Preview

The landing page provides:

- Modern SOC interface
- AI-powered cyber defense
- Threat intelligence workflow
- Secure authentication
- Interactive AI console

---

# 🏗️ Architecture

```
                    User
                      │
                      ▼
          Sentinel React Frontend
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
 Authentication   AI Gateway     Knowledge Base
       │              │              │
       ▼              ▼              ▼
   Supabase      LLM API        Vector Database
                      │
                      ▼
            MITRE ATT&CK Mapping
```

---

# ⚙️ Tech Stack

## Frontend

- React 19
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- Radix UI
- Lucide Icons

## Backend

- Supabase
- Cloudflare Workers
- AI SDK
- REST API

## AI

- Gemini
- OpenAI Compatible Models
- RAG Pipeline
- Prompt Engineering

---

# 📂 Project Structure

```
Sentinel-AI/
│
├── public/
├── src/
│
├── components/
├── pages/
├── routes/
├── hooks/
├── services/
├── lib/
├── integrations/
│     └── supabase/
│
├── assets/
├── package.json
├── vite.config.ts
├── wrangler.jsonc
└── README.md
```

---

# ⚡ Installation

Clone the repository

```bash
git clone https://github.com/CyberJana/Sentinel-AI.git
```

Go to project

```bash
cd Sentinel-AI
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Build project

```bash
npm run build
```

---

# 🔑 Environment Variables

Create a `.env` file.

```env
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=

OPENAI_API_KEY=

GOOGLE_API_KEY=

AI_GATEWAY_URL=
```

---

# 🎯 Use Cases

- SOC Operations
- Threat Hunting
- Incident Response
- Malware Investigation
- Security Research
- Threat Intelligence
- Digital Forensics
- Cybersecurity Training

---

# 📈 Roadmap

- [x] AI Chat
- [x] Authentication
- [x] Knowledge Base
- [x] MITRE ATT&CK Integration
- [x] RAG Search
- [x] AI Report Generator
- [ ] Malware Analysis
- [ ] IOC Feed Integration
- [ ] VirusTotal Integration
- [ ] Sigma Rule Generator
- [ ] YARA Rule Generator
- [ ] Splunk Integration
- [ ] Microsoft Sentinel Integration

---

# 🛡️ Security

- Secure Authentication
- Protected API Keys
- Encrypted Communication
- Role-Based Access Control
- Secure File Upload

---

# 📸 Screenshots

```
docs/

landing-page.png

dashboard.png

chat-console.png

knowledge-base.png

reports.png
```

---

# 👨‍💻 Author

**Janarthanan A**

M.Sc. Information Security & Digital Forensics

GitHub: https://github.com/CyberJana

LinkedIn: https://linkedin.com/in/your-linkedin

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

---

# 📄 License

Licensed under the MIT License.

---

# ⭐ Support

If you found this project useful, please consider giving it a ⭐ on GitHub!

---

## 🛡️ "AI Agents for Cyber Defense"

Sentinel empowers Security Operations Centers with intelligent AI agents capable of accelerating investigations, reducing analyst workload, and improving cyber defense through LLM reasoning, RAG, and MITRE ATT&CK intelligence.
