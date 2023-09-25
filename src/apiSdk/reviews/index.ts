import axios from 'axios';
import queryString from 'query-string';
import { ReviewInterface, ReviewGetQueryInterface } from 'interfaces/review';
import { GetQueryInterface, PaginatedInterface } from '../../interfaces';

export const getReviews = async (query?: ReviewGetQueryInterface): Promise<PaginatedInterface<ReviewInterface>> => {
  const response = await axios.get('/api/reviews', {
    params: query,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const createReview = async (review: ReviewInterface) => {
  const response = await axios.post('/api/reviews', review);
  return response.data;
};

export const updateReviewById = async (id: string, review: ReviewInterface) => {
  const response = await axios.put(`/api/reviews/${id}`, review);
  return response.data;
};

export const getReviewById = async (id: string, query?: GetQueryInterface) => {
  const response = await axios.get(`/api/reviews/${id}${query ? `?${queryString.stringify(query)}` : ''}`);
  return response.data;
};

export const deleteReviewById = async (id: string) => {
  const response = await axios.delete(`/api/reviews/${id}`);
  return response.data;
};
