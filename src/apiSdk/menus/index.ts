import axios from 'axios';
import queryString from 'query-string';
import { MenuInterface, MenuGetQueryInterface } from 'interfaces/menu';
import { GetQueryInterface, PaginatedInterface } from '../../interfaces';

export const getMenus = async (query?: MenuGetQueryInterface): Promise<PaginatedInterface<MenuInterface>> => {
  const response = await axios.get('/api/menus', {
    params: query,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const createMenu = async (menu: MenuInterface) => {
  const response = await axios.post('/api/menus', menu);
  return response.data;
};

export const updateMenuById = async (id: string, menu: MenuInterface) => {
  const response = await axios.put(`/api/menus/${id}`, menu);
  return response.data;
};

export const getMenuById = async (id: string, query?: GetQueryInterface) => {
  const response = await axios.get(`/api/menus/${id}${query ? `?${queryString.stringify(query)}` : ''}`);
  return response.data;
};

export const deleteMenuById = async (id: string) => {
  const response = await axios.delete(`/api/menus/${id}`);
  return response.data;
};
