import { NextRequestHandler } from '@zenstackhq/server/next';
import { enhance } from '@zenstackhq/runtime';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../server/db';

async function getPrisma(req: NextApiRequest, res: NextApiResponse) {
  return enhance(prisma);
}

export default NextRequestHandler({ getPrisma });
