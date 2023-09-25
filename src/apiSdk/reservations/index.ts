import axios from 'axios';
import queryString from 'query-string';
import { ReservationInterface, ReservationGetQueryInterface } from 'interfaces/reservation';
import { GetQueryInterface, PaginatedInterface } from '../../interfaces';

export const getReservations = async (
  query?: ReservationGetQueryInterface,
): Promise<PaginatedInterface<ReservationInterface>> => {
  const response = await axios.get('/api/reservations', {
    params: query,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const createReservation = async (reservation: ReservationInterface) => {
  const response = await axios.post('/api/reservations', reservation);
  return response.data;
};

export const updateReservationById = async (id: string, reservation: ReservationInterface) => {
  const response = await axios.put(`/api/reservations/${id}`, reservation);
  return response.data;
};

export const getReservationById = async (id: string, query?: GetQueryInterface) => {
  const response = await axios.get(`/api/reservations/${id}${query ? `?${queryString.stringify(query)}` : ''}`);
  return response.data;
};

export const deleteReservationById = async (id: string) => {
  const response = await axios.delete(`/api/reservations/${id}`);
  return response.data;
};
