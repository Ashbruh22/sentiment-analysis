import { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Grid } from '@mui/material';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import StarIcon from '@mui/icons-material/Star';

function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalReviews: 0,
    positivePercentage: 0,
    negativePercentage: 0,
    averageRating: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/stats');
        const { total_reviews, sentiment_distribution } = response.data;
        
        const positive = sentiment_distribution['positive'] || 0;
        const negative = sentiment_distribution['negative'] || 0;
        const neutral = sentiment_distribution['neutral'] || 0;
        
        const positivePercentage = Math.round((positive / total_reviews) * 100) || 0;
        const negativePercentage = Math.round((negative / total_reviews) * 100) || 0;
        
        setMetrics({
          totalReviews: total_reviews,
          positivePercentage,
          negativePercentage,
          averageRating: ((positive * 5 + neutral * 3 + negative * 1) / total_reviews).toFixed(1) || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const [sentimentTrend, setSentimentTrend] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Positive',
        data: [60, 45, 55, 70],
        backgroundColor: '#66bb6a'
      },
      {
        label: 'Neutral',
        data: [15, 20, 15, 10],
        backgroundColor: '#78909c'
      },
      {
        label: 'Negative',
        data: [15, 25, 20, 10],
        backgroundColor: '#ef5350'
      },
      {
        label: 'Sarcastic',
        data: [10, 10, 10, 10],
        backgroundColor: '#ffa726'
      }
    ]
  });

  const [languageDistribution, setLanguageDistribution] = useState({
    labels: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'],
    datasets: [{
      data: [40, 15, 10, 8, 7, 5, 5, 4, 3, 3],
      backgroundColor: ['#42a5f5', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc', '#ec407a', '#26c6da', '#ffca28', '#8d6e63', '#78909c']
    }]
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sentiment Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Monitor and analyze customer sentiment from Amazon reviews
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography color="text.secondary" gutterBottom>Total Reviews</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" component="div" sx={{ mr: 1 }}>{metrics.totalReviews}</Typography>
              <ChatBubbleOutlineIcon color="primary" />
            </Box>
            <Typography color="success.main" variant="body2">↑ 12% increase</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography color="text.secondary" gutterBottom>Positive Sentiment</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" component="div" sx={{ mr: 1 }}>{metrics.positivePercentage}%</Typography>
              <ThumbUpAltIcon color="success" />
            </Box>
            <Typography color="success.main" variant="body2">↑ 5% increase</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography color="text.secondary" gutterBottom>Negative Sentiment</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" component="div" sx={{ mr: 1 }}>{metrics.negativePercentage}%</Typography>
              <ThumbDownAltIcon color="error" />
            </Box>
            <Typography color="error.main" variant="body2">↓ 3% decrease</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography color="text.secondary" gutterBottom>Average Rating</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" component="div" sx={{ mr: 1 }}>{metrics.averageRating}</Typography>
              <StarIcon sx={{ color: '#FFB400' }} />
            </Box>
            <Typography color="success.main" variant="body2">↑ 0.2% increase</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Sentiment Trend</Typography>
            <Box sx={{ height: 300 }}>
              <Bar
                data={sentimentTrend}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, max: 100 }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Language Distribution</Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut
                data={languageDistribution}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;