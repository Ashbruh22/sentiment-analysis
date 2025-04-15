import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Slider,
  Paper,
  Stack,
  Divider
} from '@mui/material';

function Settings() {
  const [settings, setSettings] = useState({
    sentimentApiKey: '8e72jd7-demo-key',
    sarcasmApiKey: '',
    languageApiKey: 'lang-demo-3892',
    negativeThreshold: 20,
    sarcasmConfidence: 75
  });

  const handleApiKeyChange = (field) => (event) => {
    setSettings({
      ...settings,
      [field]: event.target.value
    });
  };

  const handleSliderChange = (field) => (event, newValue) => {
    setSettings({
      ...settings,
      [field]: newValue
    });
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Configure your sentiment analysis preferences
      </Typography>

      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          API Keys
        </Typography>
        <Stack spacing={3}>
          <TextField
            label="Sentiment Analysis API Key"
            value={settings.sentimentApiKey}
            onChange={handleApiKeyChange('sentimentApiKey')}
            fullWidth
          />
          <TextField
            label="Sarcasm Detection API Key"
            value={settings.sarcasmApiKey}
            onChange={handleApiKeyChange('sarcasmApiKey')}
            fullWidth
            placeholder="Enter API key"
          />
          <TextField
            label="Language Detection API Key"
            value={settings.languageApiKey}
            onChange={handleApiKeyChange('languageApiKey')}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Analysis Thresholds
        </Typography>
        <Stack spacing={4}>
          <Box>
            <Typography gutterBottom>
              Negative Sentiment Alert Threshold
            </Typography>
            <Slider
              value={settings.negativeThreshold}
              onChange={handleSliderChange('negativeThreshold')}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={0}
              max={100}
            />
            <Typography variant="caption" color="text.secondary">
              Alert when negative reviews exceed this percentage
            </Typography>
          </Box>
          <Divider />
          <Box>
            <Typography gutterBottom>
              Sarcasm Detection Confidence
            </Typography>
            <Slider
              value={settings.sarcasmConfidence}
              onChange={handleSliderChange('sarcasmConfidence')}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={0}
              max={100}
            />
            <Typography variant="caption" color="text.secondary">
              Minimum confidence level to flag a review as sarcastic
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

export default Settings;