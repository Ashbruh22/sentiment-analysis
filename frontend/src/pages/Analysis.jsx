import { useState } from 'react';
import { Container, Paper, TextField, Button, Select, MenuItem, Typography, Box, CircularProgress, Grid } from '@mui/material';
import StarRating from '../components/StarRating';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';

function Analysis() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reviewId, setReviewId] = useState(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'pa', name: 'Punjabi' }
  ];

  const analyzeSentiment = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/api/analyze', {
        text,
        language
      });

      const { success, error, details, data } = response.data;

      if (!success) {
        throw new Error(details || error || 'Analysis failed');
      }

      const { id, sentiment, sarcasm, stats } = data;
      setReviewId(id);
      setResult({
        sentiment,
        sarcasm,
        stats
      });
    } catch (err) {
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'An error occurred during analysis';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!result) return null;
    
    return {
      labels: ['Sentiment Score', 'Sarcasm Probability'],
      datasets: [
        {
          label: 'Analysis Results',
          data: [
            parseFloat((result.sentiment.score * 100).toFixed(2)),
            parseFloat((result.sarcasm.score * 100).toFixed(2))
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Sentiment Analysis
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Analyze the sentiment of your text
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              label="Enter text to analyze"
              value={text}
              onChange={(e) => setText(e.target.value)}
              error={!!error}
              helperText={error}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              fullWidth
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              variant="outlined"
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              onClick={analyzeSentiment}
              disabled={loading}
              sx={{ height: '100%' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Analyze'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {result && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Analysis Results</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" gutterBottom>
                <strong>Sentiment:</strong> {result.sentiment.label}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Confidence:</strong> {(result.sentiment.score * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Sarcasm Probability:</strong> {(result.sarcasm.score * 100).toFixed(2)}%
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Your Rating:</strong>
                </Typography>
                <StarRating
                  reviewId={reviewId}
                  onRatingChange={(newRating) => console.log('New rating:', newRating)}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={getChartData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100
                      }
                    }
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
}

export default Analysis;