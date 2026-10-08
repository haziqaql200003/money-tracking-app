import { enAcct } from './acct';
import { enAuth } from './auth';
import { enCommon } from './common';
import { enDebt } from './debt';
import { enFc } from './fc';
import { enHome } from './home';
import { enImp } from './imp';
import { enMore } from './more';
import { enPlan } from './plan';
import { enTx } from './tx';

export const en = { ...enCommon, ...enAuth, ...enHome, ...enTx, ...enAcct, ...enPlan, ...enMore, ...enImp, ...enDebt, ...enFc };
