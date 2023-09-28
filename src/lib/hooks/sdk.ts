/* eslint-disable */
import type { Prisma, menu } from '@prisma/client';
import { CheckSelect } from '@zenstackhq/swr/runtime';
import * as request from '@zenstackhq/swr/runtime';

const sdk = {
  menu: {
    create: async function createMenu<T extends Prisma.menuCreateArgs>(
      args: Prisma.SelectSubset<T, Prisma.menuCreateArgs>,
    ) {
      return await request.post<CheckSelect<T, menu, Prisma.menuGetPayload<T>>, true>(
        `${endpoint}/menu/create`,
        args,
        mutate,
        fetch,
        true,
      );
    },
    createMany: async function createManyMenu<T extends Prisma.menuCreateManyArgs>(
      args: Prisma.SelectSubset<T, Prisma.menuCreateManyArgs>,
    ) {
      return await request.post<Prisma.BatchPayload, false>(`${endpoint}/menu/createMany`, args, mutate, fetch, false);
    },
    update: async function updateMenu<T extends Prisma.menuUpdateArgs>(
      args: Prisma.SelectSubset<T, Prisma.menuUpdateArgs>,
    ) {
      return await request.put<Prisma.menuGetPayload<T>, true>(`${endpoint}/menu/update`, args, mutate, fetch, true);
    },
  },
};
