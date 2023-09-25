import * as yup from 'yup';

export const reservationValidationSchema = yup.object().shape({
  date: yup.date().nullable(),
  time: yup.string().nullable(),
  number_of_people: yup.number().integer().nullable(),
  table_number: yup.number().integer().nullable(),
  user_id: yup.string().nullable().required(),
  restaurant_id: yup.string().nullable().required(),
});
