import { useState, useEffect } from 'react';
import { FaThumbsUp, FaThumbsDown, FaStar } from 'react-icons/fa';
import Slider from '@mui/material/Slider';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    sentiments: [],
    rating: [1, 5],
    languages: []
  });

  useEffect(() => {
    fetchReviews();
  }, [filters]);


  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.sentiments.length > 0) queryParams.append('sentiments', filters.sentiments.join(','));
      if (filters.rating) {
        queryParams.append('rating_min', filters.rating[0]);
        queryParams.append('rating_max', filters.rating[1]);
      }
      if (filters.languages.length > 0) queryParams.append('languages', filters.languages.join(','));
      if (filters.search) queryParams.append('search', filters.search);

      const response = await fetch(`http://localhost:5000/api/reviews?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews.map(review => ({
          ...review,
          star_rating: Number(review.star_rating) || 0,
          helpful_count: Number(review.helpful_count) || 0,
          created_at: review.created_at || new Date().toISOString()
        })));
      } else {
        throw new Error(data.error || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Unable to load reviews. Please try again later.');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={index < rating ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      'Positive': 'bg-green-100 text-green-800',
      'Negative': 'bg-red-100 text-red-800',
      'Neutral': 'bg-gray-100 text-gray-800',
      'Sarcastic': 'bg-purple-100 text-purple-800'
    };
    return colors[sentiment] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <div className="w-80 min-h-screen bg-white shadow-xl p-6 flex flex-col gap-6 border-r border-gray-200">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Filters</h2>
            <span className="text-sm text-gray-500">{reviews.length} reviews</span>
          </div>

          {/* Search */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Search</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search reviews..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sentiment */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Sentiment</h3>
            <div className="flex flex-wrap gap-2">
              {['Positive', 'Neutral', 'Negative', 'Sarcastic'].map(sentiment => (
                <button
                  key={sentiment}
                  onClick={() => {
                    const newSentiments = filters.sentiments.includes(sentiment)
                      ? filters.sentiments.filter(s => s !== sentiment)
                      : [...filters.sentiments, sentiment];
                    handleFilterChange('sentiments', newSentiments);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${filters.sentiments.includes(sentiment)
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
              value={filters.rating}
              onChange={(_, newValue) => handleFilterChange('rating', newValue)}
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
              {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'].map(language => (
                <button
                  key={language}
                  onClick={() => {
                    const newLanguages = filters.languages.includes(language)
                      ? filters.languages.filter(l => l !== language)
                      : [...filters.languages, language];
                    handleFilterChange('languages', newLanguages);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${filters.languages.includes(language)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Customer Reviews</h1>
            <div className="text-sm text-gray-500">{reviews.length} reviews</div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              Error: {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          <div className="space-y-6">
            {reviews.length === 0 && !loading && !error && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
                No reviews found matching your filters.
              </div>
            )}
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:transform hover:scale-[1.02] border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-lg">{review.username}</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${getSentimentColor(review.sentiment)} backdrop-blur-sm`}>
                        {review.sentiment}
                      </span>
                      <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{review.language}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex text-yellow-400 transform scale-110">{renderStars(review.star_rating)}</div>
                      <span className="text-sm font-medium text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-300">
                      <FaThumbsUp className="w-4 h-4" />
                      <span>Helpful</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all duration-300">
                      <FaThumbsDown className="w-4 h-4" />
                      <span>Not Helpful</span>
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">{review.text}</p>
                {review.helpful_count > 0 && (
                  <p className="text-sm font-medium text-gray-500 mt-6 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg inline-block">
                    <FaThumbsUp className="w-4 h-4 text-blue-500" />
                    {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;