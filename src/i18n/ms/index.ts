import type { en } from '../en';
import { msAcct } from './acct';
import { msAuth } from './auth';
import { msCommon } from './common';
import { msDebt } from './debt';
import { msFc } from './fc';
import { msHome } from './home';
import { msImp } from './imp';
import { msMore } from './more';
import { msPlan } from './plan';
import { msOb } from './ob';
import { msRpt } from './rpt';
import { msAlloc } from './alloc';
import { msCal } from './cal';
import { msFb } from './fb';
import { msMrep } from './mrep';
import { msTax } from './tax';
import { msTx } from './tx';
import { msScan } from './scan';
import { msInbox } from './inbox';

// Typed against the English dictionary: a missing or extra Malay key is a compile error.
export const ms: Record<keyof typeof en, string> = { ...msCommon, ...msAuth, ...msHome, ...msTx, ...msAcct, ...msPlan, ...msMore, ...msImp, ...msDebt, ...msFc, ...msRpt, ...msOb, ...msTax, ...msCal, ...msAlloc, ...msMrep, ...msFb, ...msScan, ...msInbox };
