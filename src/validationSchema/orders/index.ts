import * as yup from 'yup';

export const orderValidationSchema = yup.object().shape({
  date: yup.date().nullable(),
  total_price: yup.number().integer().nullable(),
  status: yup.string().nullable(),
  user_id: yup.string().nullable().required(),
  restaurant_id: yup.string().nullable().required(),
});
