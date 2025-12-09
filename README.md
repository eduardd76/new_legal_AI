# AI Contract Review Platform - MVP

> AI-powered contract analysis for Romanian & EU law compliance

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-16-black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()

## 🎯 Overview

An AI-assisted legal analysis platform that reviews contracts and identifies risks, compliance issues, and provides suggestions based on Romanian Civil Code and EU regulations (especially GDPR).

### Key Features

✅ **Smart Document Upload** - PDF & DOCX support with drag-and-drop  
✅ **AI-Powered Analysis** - Multi-provider (Claude, OpenAI) contract review  
✅ **Risk Assessment** - Automatic scoring and categorization  
✅ **Compliance Checking** - Romanian law + EU GDPR validation  
✅ **Side-by-Side Review** - Document viewer with inline comments  
✅ **Legal References** - Citations to relevant laws and articles  
✅ **Role-Based Access** - Legal professionals vs business users  
✅ **Audit Trail** - GDPR-compliant activity logging  

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your keys

# Start development
npm run dev
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete setup instructions.

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - Production setup
- **[Task Roadmap](./TASKS.md)** - Implementation plan  
- **[Progress Report](./MVP_PROGRESS.md)** - Current status

## 🏗️ Tech Stack

Next.js 14 • TypeScript • Tailwind • Supabase • Claude AI • Playwright

See architecture details in [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🧪 Testing

```bash
npm test  # Run Playwright tests
```

## ⚠️ Disclaimer

**AI analysis is NOT legal advice.** All results must be reviewed by qualified legal professionals.

---

**MVP Status**: ✅ Ready for testing  
**Built**: December 2024
