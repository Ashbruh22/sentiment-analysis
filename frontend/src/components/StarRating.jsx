import { useState } from 'react';
import { Rating, Typography, Box } from '@mui/material';
import axios from 'axios';

function StarRating({ reviewId, initialRating = 0, onRatingChange }) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(-1);

  const handleRatingChange = async (event, newValue) => {
    setRating(newValue);

    try {
      const response = await axios.post('http://localhost:5000/api/rate', {
        reviewId,
        rating: newValue
      });

      if (response.data.success) {
        onRatingChange?.(newValue);
      }
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}
    >
      <Rating
        value={rating}
        precision={1}
        onChange={handleRatingChange}
        onChangeActive={(event, newHover) => {
          setHover(newHover);
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {hover !== -1 ? hover : rating} stars
      </Typography>
    </Box>
  );
}

export default StarRating;