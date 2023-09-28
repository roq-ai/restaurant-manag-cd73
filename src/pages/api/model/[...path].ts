import { enhance } from '@zenstackhq/runtime';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../server/db';
import { makeHandler, NextHandler } from '../../../lib/handler';

async function getPrisma(req: NextApiRequest, res: NextApiResponse) {
  return enhance(prisma);
}

export default NextHandler({ getPrisma });
