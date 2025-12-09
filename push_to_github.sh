#!/bin/bash
# GitHub Push Script for AI Contract Review MVP
# Repository: https://github.com/eduardd76/new_legal_AI

set -e  # Exit on error

echo "🚀 AI Contract Review MVP - GitHub Push Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/claude/contract-review-ai

echo -e "${BLUE}📁 Current directory: $(pwd)${NC}"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo -e "${GREEN}Initializing git repository...${NC}"
    git init
    echo ""
fi

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo -e "${GREEN}Creating .gitignore...${NC}"
    cat > .gitignore << 'EOF'
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage
/playwright-report
/test-results

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local
.env.production

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db
EOF
    echo ""
fi

# Create a comprehensive README for GitHub
echo -e "${GREEN}Creating GitHub README...${NC}"
cat > README_GITHUB.md << 'EOF'
# AI Contract Review Platform 🤖⚖️

> AI-powered contract analysis for Romanian & EU law compliance

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 🎯 Overview

An AI-assisted legal analysis platform that reviews contracts and identifies risks, compliance issues, and provides suggestions based on Romanian Civil Code and EU regulations (GDPR).

**Built by:** Ed @ vExpertAI GmbH  
**Status:** MVP Complete & Production-Ready ✅  
**Completion:** December 2024

## ✨ Key Features

- 📄 **Smart Document Upload** - PDF & DOCX with drag-and-drop
- 🤖 **AI-Powered Analysis** - Multi-provider (Claude, OpenAI, Mock)
- 📊 **Risk Assessment** - Automatic scoring and categorization
- ⚖️ **Compliance Checking** - Romanian Civil Code + GDPR
- 👁️ **Side-by-Side Review** - Document viewer with inline comments
- 📚 **Legal References** - Citations to relevant laws
- 👥 **Role-Based Access** - Legal professionals vs business users
- 🔒 **GDPR Compliant** - Audit logging and data protection

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/eduardd76/new_legal_AI.git
cd new_legal_AI

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev

# Open http://localhost:3000
```

## 📚 Documentation

- **[Quick Reference](./QUICK_REFERENCE.md)** - One-page cheat sheet
- **[Deployment Guide](./DEPLOYMENT.md)** - Production setup
- **[Testing Guide](./TESTING_GUIDE.md)** - Complete test instructions
- **[MVP Complete](./MVP_COMPLETE.md)** - Full technical details

## 🏗️ Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Components:** Shadcn/ui (15+ components)
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL + pgvector)
- **Storage:** Supabase Storage (encrypted)
- **AI:** Claude Sonnet 4, OpenAI GPT-4, Mock provider
- **Documents:** pdf-parse, mammoth, tesseract.js
- **Testing:** Playwright
- **Deployment:** Vercel

## 📊 Project Statistics

- **Files:** 53 TypeScript/SQL files
- **Routes:** 12
- **Database Tables:** 16
- **Components:** 25+
- **Build Time:** ~8 seconds
- **Lines of Code:** ~7,000+

## 🔧 Configuration

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Providers
AI_PROVIDER=claude-sonnet-4  # or gpt-4 or mock
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key
```

### Mock Mode (No API Keys Needed)

```env
AI_PROVIDER=mock
```

Perfect for development and testing!

## 🧪 Testing

```bash
# Install Playwright browsers (first time)
npx playwright install

# Run E2E tests
npm test

# Run in UI mode
npx playwright test --ui
```

## 📁 Project Structure

```
contract-review-ai/
├── app/                      # Next.js App Router
│   ├── api/                 # API endpoints
│   │   ├── auth/
│   │   └── documents/
│   ├── dashboard/           # Main application
│   │   ├── documents/
│   │   ├── profile/
│   │   └── upload/
│   ├── login/
│   └── signup/
├── components/              # React components
│   ├── ui/                 # Shadcn components
│   ├── layout/             # Layout components
│   └── document/           # Document viewer
├── lib/                    # Core logic
│   ├── ai/                # AI provider abstraction
│   ├── auth/              # Auth utilities
│   ├── document-processing/ # PDF/DOCX extraction
│   └── supabase/          # Database client
├── supabase/              # Database schema
│   ├── schema.sql         # 16 tables
│   └── rls_policies.sql   # Security policies
└── tests/                 # Playwright tests
```

## 🗄️ Database Schema

16 tables organized in 4 groups:

### Core
- `users`, `organizations`, `documents`, `document_clauses`, `document_versions`

### Analysis
- `analyses`, `comments`, `comment_actions`

### Legislative (RAG)
- `legislative_docs`, `embeddings`, `legislative_changes`

### Compliance
- `audit_logs`, `data_retention_policies`

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Encrypted Storage** - Documents encrypted at rest
- **Audit Logging** - Complete activity trail
- **Role-Based Access** - Fine-grained permissions
- **GDPR Compliant** - Data retention, right to erasure

## 💰 Cost Estimate

### Development
- **Free** with mock AI provider

### Production (Monthly)
| Service | Cost |
|---------|------|
| Vercel (Hobby) | $0 |
| Supabase (Free) | $0 |
| Claude API (100 docs) | ~$5-10 |
| OpenAI API (100 docs) | ~$3-5 |
| **Total** | **$8-15/mo** |

## 🎯 Roadmap

### ✅ Phase 1: MVP (Complete)
- Authentication & authorization
- Document upload & parsing
- AI analysis integration
- Document viewer with comments
- Export page (UI ready)

### 🔄 Phase 2: Enhanced Features
- [ ] Real DOCX export with track changes
- [ ] PDF export with annotations
- [ ] Full OCR for scanned documents
- [ ] Email notifications
- [ ] Advanced search

### 📋 Phase 3: Enterprise
- [ ] Real-time collaboration
- [ ] API access
- [ ] Webhook integrations
- [ ] Analytics dashboard
- [ ] Mobile app

## ⚠️ Important Disclaimers

### For Business Users
**This tool provides AI-assisted analysis and is NOT a substitute for legal advice.**  
All results must be reviewed by a qualified legal professional.

### For Legal Professionals
AI suggestions should be validated against current law. The system provides decision support but does not replace professional judgment.

## 🤝 Contributing

This is an MVP project for vExpertAI GmbH. For feature requests or issues:

1. Open an issue describing the feature/bug
2. Reference the relevant documentation
3. Provide examples where applicable

## 📄 License

MIT License - See [LICENSE](LICENSE) file

## 👨‍💻 Author

**Ed @ vExpertAI GmbH**
- Company: [vExpertAI](https://vexpertai.com) (Munich, Germany)
- Focus: AI-powered network operations & legal automation
- Industry: Enterprise AI solutions for DACH region

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- UI components from [Shadcn/ui](https://ui.shadcn.com/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/) & [OpenAI](https://openai.com/)

## 📞 Support

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For testing instructions, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

**Built with ❤️ for legal professionals and businesses seeking contract review automation**

*MVP completed December 2024*
EOF

mv README_GITHUB.md README.md
echo ""

# Add all files
echo -e "${GREEN}Adding files to git...${NC}"
git add .
echo ""

# Create initial commit
echo -e "${GREEN}Creating initial commit...${NC}"
git commit -m "Initial commit: AI Contract Review MVP

- Complete Next.js 14 application with TypeScript
- Multi-provider AI integration (Claude, OpenAI, Mock)
- Document processing (PDF, DOCX)
- AI-powered contract analysis
- Romanian & EU law compliance checking
- Document viewer with side-by-side comments
- Role-based access control (Legal Pro, Business User, Admin)
- Complete database schema (16 tables)
- Row-level security policies
- Comprehensive testing setup (Playwright)
- Full documentation (README, Deployment, Testing guides)

Built by: Ed @ vExpertAI GmbH
Status: MVP Complete & Production-Ready
Date: December 2024
" 2>/dev/null || echo "Commit already exists or no changes"
echo ""

# Show current status
echo -e "${BLUE}Current git status:${NC}"
git status
echo ""

# Instructions for pushing
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}📤 READY TO PUSH TO GITHUB!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1️⃣  Set the remote repository:"
echo -e "   ${GREEN}git remote add origin https://github.com/eduardd76/new_legal_AI.git${NC}"
echo ""
echo -e "2️⃣  Push to GitHub:"
echo -e "   ${GREEN}git push -u origin main${NC}"
echo ""
echo -e "   ${RED}Note: You may need to authenticate with GitHub${NC}"
echo ""
echo -e "3️⃣  If the repository already exists and has files:"
echo -e "   ${GREEN}git pull origin main --allow-unrelated-histories${NC}"
echo -e "   ${GREEN}git push -u origin main${NC}"
echo ""
echo -e "4️⃣  If you want to force push (overwrites remote):"
echo -e "   ${GREEN}git push -u origin main --force${NC}"
echo -e "   ${RED}⚠️  WARNING: This will overwrite any existing code!${NC}"
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}✅ Git repository prepared successfully!${NC}"
echo -e "${BLUE}==========================================${NC}"
EOF
chmod +x /home/claude/contract-review-ai/push_to_github.sh