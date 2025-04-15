import { useState } from 'react';
import { Slider } from '@mui/material';

const Filters = ({ onFilterChange }) => {
  const [search, setSearch] = useState('');
  const [selectedSentiments, setSelectedSentiments] = useState([]);
  const [rating, setRating] = useState([1, 5]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  const sentiments = ['Positive', 'Neutral', 'Negative', 'Sarcastic'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

  const handleSentimentClick = (sentiment) => {
    setSelectedSentiments(prev =>
      prev.includes(sentiment)
        ? prev.filter(s => s !== sentiment)
        : [...prev, sentiment]
    );
  };

  const handleLanguageClick = (language) => {
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleRatingChange = (event, newValue) => {
    setRating(newValue);
  };

  // Update parent component with filter changes
  useState(() => {
    onFilterChange({
      search,
      sentiments: selectedSentiments,
      rating,
      languages: selectedLanguages
    });
  }, [search, selectedSentiments, rating, selectedLanguages]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Filters</h2>
        <span className="text-sm text-gray-500">12 reviews</span>
      </div>

      {/* Search */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Search</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sentiment */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Sentiment</h3>
        <div className="flex flex-wrap gap-2">
          {sentiments.map(sentiment => (
            <button
              key={sentiment}
              onClick={() => handleSentimentClick(sentiment)}
              className={`px-3 py-1 rounded-full text-sm ${selectedSentiments.includes(sentiment)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {sentiment}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Rating</h3>
        <Slider
          value={rating}
          onChange={handleRatingChange}
          valueLabelDisplay="auto"
          min={1}
          max={5}
          step={1}
          marks
          className="text-blue-500"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>1 star</span>
          <span>5 stars</span>
        </div>
      </div>

      {/* Language */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Language</h3>
        <div className="flex flex-wrap gap-2">
          {languages.map(language => (
            <button
              key={language}
              onClick={() => handleLanguageClick(language)}
              className={`px-3 py-1 rounded-full text-sm ${selectedLanguages.includes(language)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {language}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Filters;