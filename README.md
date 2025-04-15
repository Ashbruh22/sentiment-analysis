# Intelligent Sentiment Analysis System for Amazon Reviews

A comprehensive sentiment analysis system with multilingual and sarcasm detection capabilities for analyzing Amazon reviews.

## Features

- Real-time sentiment analysis of Amazon reviews
- Multilingual support using BERT
- Sarcasm detection using advanced NLP
- Interactive visualization dashboard
- Detailed sentiment insights and metrics

## Project Structure

```
├── frontend/           # React frontend application
├── backend/            # Python Flask backend
│   ├── models/         # ML models and configurations
│   ├── utils/          # Helper functions
│   └── api/            # API endpoints
└── data/               # Training and test datasets
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm run install-all
   ```

2. Start the development servers:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

## Technology Stack

- Frontend: React, Vite, TailwindCSS
- Backend: Python, Flask, Transformers
- ML: BERT, Hugging Face Transformers
- Database: SQLite (for development)