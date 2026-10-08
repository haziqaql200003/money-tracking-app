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
import { msTx } from './tx';

// Typed against the English dictionary: a missing or extra Malay key is a compile error.
export const ms: Record<keyof typeof en, string> = { ...msCommon, ...msAuth, ...msHome, ...msTx, ...msAcct, ...msPlan, ...msMore, ...msImp, ...msDebt, ...msFc };
